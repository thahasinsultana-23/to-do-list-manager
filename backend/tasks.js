const express = require("express");
const supabase = require("./supabase");

const router = express.Router();

const allowedPriorities = ["low", "medium", "high"];

function validId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function validateTask(body) {
  if (!body || typeof body.title !== "string") {
    return "Task title is required.";
  }

  if (!body.title.trim() || body.title.trim().length > 120) {
    return "Title must contain 1 to 120 characters.";
  }

  if (
    body.priority !== undefined &&
    !allowedPriorities.includes(body.priority)
  ) {
    return "Priority must be low, medium or high.";
  }

  if (
    body.description !== undefined &&
    typeof body.description !== "string"
  ) {
    return "Description must be text.";
  }

  if (
    body.due_date &&
    !/^\d{4}-\d{2}-\d{2}$/.test(body.due_date)
  ) {
    return "Due date must use YYYY-MM-DD format.";
  }

  return null;
}

function handleDatabaseError(res, error) {
  console.error("Database error:", error.message);
  return res.status(500).json({
    error: "Database request failed. Check your Supabase setup."
  });
}

// Get all tasks
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return handleDatabaseError(res, error);

  res.json(data);
});

// Create a task
router.post("/", async (req, res) => {
  const validationError = validateTask(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const task = {
    title: req.body.title.trim(),
    description: (req.body.description || "").trim(),
    due_date: req.body.due_date || null,
    priority: req.body.priority || "medium"
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert(task)
    .select()
    .single();

  if (error) return handleDatabaseError(res, error);

  res.status(201).json(data);
});

// Edit a task
router.put("/:id", async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: "Invalid task ID." });
  }

  const validationError = validateTask(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const updates = {
    title: req.body.title.trim(),
    description: (req.body.description || "").trim(),
    due_date: req.body.due_date || null,
    priority: req.body.priority || "medium"
  };

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .maybeSingle();

  if (error) return handleDatabaseError(res, error);
  if (!data) return res.status(404).json({ error: "Task not found." });

  res.json(data);
});

// Mark a task complete or incomplete
router.patch("/:id/complete", async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: "Invalid task ID." });
  }

  if (typeof req.body.completed !== "boolean") {
    return res.status(400).json({
      error: "Completed must be true or false."
    });
  }

  const { data, error } = await supabase
    .from("tasks")
    .update({ completed: req.body.completed })
    .eq("id", req.params.id)
    .select()
    .maybeSingle();

  if (error) return handleDatabaseError(res, error);
  if (!data) return res.status(404).json({ error: "Task not found." });

  res.json(data);
});

// Delete a task
router.delete("/:id", async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ error: "Invalid task ID." });
  }

  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", req.params.id)
    .select("id")
    .maybeSingle();

  if (error) return handleDatabaseError(res, error);
  if (!data) return res.status(404).json({ error: "Task not found." });

  res.json({ message: "Task deleted successfully." });
});

module.exports = router;