import app from './app';

const PORT = process.env.PORT ?? 3000;

app.get("/", (req, res) => {
  res.send("Healthy Habits API is running");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API working" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
