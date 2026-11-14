import express from "express";
import path from "node:path";
import * as db from "./config.js";
import DOMPurify from "isomorphic-dompurify";
import RateLimit from "express-rate-limit";

//process.loadEnvFile();

const app = express();
app.set("view engine", "ejs");

const limit = RateLimit({
    windowMs: 1000*60,
    limit: 75,
    legacyHeaders: false
});

const postLimit = RateLimit({
    windowMs: 1000*60,
    limit: 3,
    legacyHeaders: false
});

app.use(limit);
app.use(express.static(path.join(process.cwd(), "public")));
app.use(express.urlencoded({extended: true}));

app.get("/post/:id", async (req, res, next) => {
    let id = Number(req.params.id);
    if (!(id !== NaN && id >= 0 && id === Math.floor(id))) {
        return next();
    }
    let post = (await db.q("SELECT * FROM p WHERE id = $1;", [id])).rows;
    if (!post.length) return next();
    res.render("index.ejs", {p:post[0], s: "post"});
});

app.get("/:t/new", (req, res, next) => {
    if (req.params.t !== "a" && req.params.t !== "b") {
        return next();
    }
    res.render("index.ejs", {p:{t: req.params.t}, s: "form"});
});

app.post("/:t/new", postLimit, async (req, res) => {
    req.body.c = DOMPurify.sanitize(req.body.c);
    await postNew(req.body, req.params.t);
    res.redirect("/a/0");
});

app.get("/", (req, res) => {
    res.redirect("/a/0")
});

app.get("/:t/:n", async (req, res, next) => {
    if (req.params.t !== "a" && req.params.t !== "b") {
        return next();
    }
    let n = Number(req.params.n);
    if (!(n >= 0 && n === Math.floor(n))) {
        return res.redirect(`/${req.params.t}/0`);
    }

    let posts = await getPosts(req.params.t, n * 20);
    res.render("index.ejs", {p: {posts, b: req.params.t, n: n}, s: "main"});
});

app.use((req, res) => {
    res.statusCode = 404;
    res.send("<h1>404 Not Found</h1>");
});

const HOST = process.env.HOST;
const PORT = process.env.PORT;

app.listen(PORT, HOST, () => {
    console.log("The board's up");
});

async function getPosts(t,n) {
    try {
        return (await db.q("SELECT * FROM p WHERE rel = $1 ORDER BY created_at DESC OFFSET $2 LIMIT 20;", [t, n])).rows; 
    } catch(err) {
        console.error(err);
        return [];
    }
}

async function postNew({s,c},r) {
    try {
        if (!(s && c)) {
            throw new Error("empty request");
        }
        await  db.q("INSERT INTO p(subject, content, rel) VALUES($1, $2, $3);", [s, c, r]);
        console.log(`New post has been added: ${s}`);
    } catch(err) {
        console.log(`Failed to add a new post due to the reason: ${err.message}`);
    }
}