"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { differenceInMinutes, format } from "date-fns";
import { Bell, CheckCircle2, GripVertical, LogOut, Pencil, Plus, Trash2, UserRoundCog } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/theme-toggle";
import type { TaskCategory, TaskItem, UserProfile } from "@/types/app";

type Props = {
  initialUser: UserProfile;
  initialTasks: TaskItem[];
  initialCategories: TaskCategory[];
};

type EditDraft = {
  title: string;
  description: string;
  dueDate: string;
  priority: TaskItem["priority"];
  status: TaskItem["status"];
  categoryId: string;
  reminderMinutes: string;
};

function sortTasks(tasks: TaskItem[]) {
  return [...tasks].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const tz = date.getTimezoneOffset();
  return new Date(date.getTime() - tz * 60000).toISOString().slice(0, 16);
}

async function parseApi<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}

function SortableTask({
  task,
  category,
  reminderLeadMinutes,
  onToggle,
  onEdit,
  onDelete,
  disableDrag,
}: {
  task: TaskItem;
  category?: TaskCategory;
  reminderLeadMinutes: number;
  onToggle: (task: TaskItem) => Promise<void>;
  onEdit: (task: TaskItem) => void;
  onDelete: (id: string) => Promise<void>;
  disableDrag?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: disableDrag,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const now = new Date();
  const overdue = Boolean(dueDate && !task.completed && dueDate.getTime() < now.getTime());
  const dueSoon = Boolean(
    dueDate && !task.completed && differenceInMinutes(dueDate, now) <= reminderLeadMinutes && !overdue,
  );

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border bg-paper p-4 ${isDragging ? "border-accent shadow-lg" : "border-ink/15"}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink/15"
          {...attributes}
          {...listeners}
          disabled={disableDrag}
        >
          <GripVertical className="h-4 w-4 text-muted" />
        </button>
        <button
          type="button"
          onClick={() => void onToggle(task)}
          className={`mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border ${
            task.completed ? "border-accent bg-accent text-white" : "border-ink/30 text-transparent"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className={`font-semibold ${task.completed ? "line-through text-muted" : "text-ink"}`}>{task.title}</h3>
          {task.description ? <p className="text-sm text-muted">{task.description}</p> : null}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="badge">{task.priority}</span>
            <span className="badge">{task.status.replace("_", " ")}</span>
            <span className="badge" style={{ color: category?.color ?? "#6b7280" }}>
              {category?.name ?? "Uncategorized"}
            </span>
            {dueDate ? (
              <span className={`badge ${overdue ? "text-red-700" : dueSoon ? "text-amber-700" : ""}`}>
                Due {format(dueDate, "MMM d, h:mm a")}
              </span>
            ) : null}
          </div>
        </div>
        <button type="button" className="icon-btn" onClick={() => onEdit(task)}>
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" className="icon-btn danger" onClick={() => void onDelete(task.id)}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

export function TaskDashboard({ initialUser, initialTasks, initialCategories }: Props) {
  const router = useRouter();
  const [user] = useState(initialUser);
  const [tasks, setTasks] = useState(() => sortTasks(initialTasks));
  const [categories, setCategories] = useState(initialCategories);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const notified = useRef<Set<string>>(new Set());
  const [newCategory, setNewCategory] = useState({ name: "", color: "#2d7f5e" });
  const [categoryToDelete, setCategoryToDelete] = useState("");
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium" as TaskItem["priority"],
    status: "todo" as TaskItem["status"],
    categoryId: "",
    reminderMinutes: "",
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const orderedTasks = useMemo(() => sortTasks(tasks), [tasks]);
  const filteredTasks = useMemo(() => {
    return orderedTasks.filter((task) => {
      if (statusFilter === "completed" && !task.completed) return false;
      if (statusFilter === "open" && task.completed) return false;
      if (statusFilter === "in_progress" && task.status !== "in_progress") return false;
      if (categoryFilter !== "all" && task.categoryId !== categoryFilter) return false;
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        return task.title.toLowerCase().includes(query) || task.description.toLowerCase().includes(query);
      }
      return true;
    });
  }, [orderedTasks, statusFilter, categoryFilter, search]);
  const canReorder = statusFilter === "all" && categoryFilter === "all" && search.trim() === "";
  const dueSoon = useMemo(() => {
    const now = new Date();
    return orderedTasks.filter((task) => {
      if (task.completed || !task.dueDate) return false;
      const diff = differenceInMinutes(new Date(task.dueDate), now);
      return diff >= 0 && diff <= user.reminderLeadMinutes;
    });
  }, [orderedTasks, user.reminderLeadMinutes]);
  const overdue = useMemo(() => {
    const now = new Date().getTime();
    return orderedTasks.filter((task) => !task.completed && task.dueDate && new Date(task.dueDate).getTime() < now);
  }, [orderedTasks]);

  useEffect(() => {
    if (!notifyEnabled || typeof window === "undefined" || Notification.permission !== "granted") return;
    for (const task of dueSoon) {
      if (notified.current.has(task.id)) continue;
      new Notification("Task reminder", { body: `${task.title} is due soon.` });
      notified.current.add(task.id);
    }
  }, [notifyEnabled, dueSoon]);

  async function reloadCategoriesFromDb() {
    const res = await fetch("/api/categories", { cache: "no-store" });
    const data = await parseApi<{ categories: TaskCategory[] }>(res);
    setCategories(data.categories);
    return data.categories;
  }

  useEffect(() => {
    if (categories.length === 0) {
      setCategoryToDelete("");
      return;
    }

    if (!categoryToDelete || !categories.some((category) => category.id === categoryToDelete)) {
      setCategoryToDelete(categories[0].id);
    }
  }, [categories, categoryToDelete]);

  async function createTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          dueDate: draft.dueDate || undefined,
          priority: draft.priority,
          status: draft.status,
          categoryId: draft.categoryId || undefined,
          reminderMinutes: draft.reminderMinutes ? Number(draft.reminderMinutes) : undefined,
        }),
      });
      const data = await parseApi<{ task: TaskItem }>(res);
      setTasks((prev) => sortTasks([...prev, data.task]));
      setDraft({ title: "", description: "", dueDate: "", priority: "medium", status: "todo", categoryId: "", reminderMinutes: "" });
      toast.success("Task created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create task.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleTask(task: TaskItem) {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed }),
      });
      const data = await parseApi<{ task: TaskItem }>(res);
      setTasks((prev) => prev.map((item) => (item.id === task.id ? data.task : item)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update task.");
    }
  }

  async function deleteTask(id: string) {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      await parseApi<{ message: string }>(res);
      setTasks((prev) => prev.filter((task) => task.id !== id));
      toast.success("Task deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete task.");
    }
  }

  function startEdit(task: TaskItem) {
    setEditingTaskId(task.id);
    setEditDraft({
      title: task.title,
      description: task.description,
      dueDate: toDateInputValue(task.dueDate),
      priority: task.priority,
      status: task.status,
      categoryId: task.categoryId ?? "",
      reminderMinutes: task.reminderMinutes ? String(task.reminderMinutes) : "",
    });
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingTaskId || !editDraft) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${editingTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editDraft.title,
          description: editDraft.description,
          dueDate: editDraft.dueDate || null,
          priority: editDraft.priority,
          status: editDraft.status,
          categoryId: editDraft.categoryId || null,
          reminderMinutes: editDraft.reminderMinutes ? Number(editDraft.reminderMinutes) : null,
        }),
      });
      const data = await parseApi<{ task: TaskItem }>(res);
      setTasks((prev) => prev.map((task) => (task.id === editingTaskId ? data.task : task)));
      setEditingTaskId(null);
      setEditDraft(null);
      toast.success("Task updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update task.");
    } finally {
      setBusy(false);
    }
  }

  async function createCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });
      const data = await parseApi<{ category: TaskCategory }>(res);
      await reloadCategoriesFromDb();
      setCategoryToDelete(data.category.id);
      setNewCategory((prev) => ({ ...prev, name: "" }));
      toast.success("Category saved to database.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add category.");
    }
  }

  async function deleteCategoryFromForm() {
    if (!categoryToDelete) {
      toast.error("Select a category to delete.");
      return;
    }

    try {
      const res = await fetch(`/api/categories/${categoryToDelete}`, { method: "DELETE" });
      await parseApi<{ message: string }>(res);

      const deletedCategoryId = categoryToDelete;
      await reloadCategoriesFromDb();
      setTasks((prev) =>
        prev.map((task) => (task.categoryId === deletedCategoryId ? { ...task, categoryId: null } : task)),
      );
      setDraft((prev) => ({
        ...prev,
        categoryId: prev.categoryId === deletedCategoryId ? "" : prev.categoryId,
      }));
      setEditDraft((prev) =>
        prev ? { ...prev, categoryId: prev.categoryId === deletedCategoryId ? "" : prev.categoryId } : prev,
      );
      setCategoryFilter((prev) => (prev === deletedCategoryId ? "all" : prev));
      toast.success("Category deleted from database.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete category.");
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !canReorder) return;
    const current = sortTasks(tasks);
    const oldIndex = current.findIndex((task) => task.id === active.id);
    const newIndex = current.findIndex((task) => task.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const moved = arrayMove(current, oldIndex, newIndex).map((task, idx) => ({ ...task, sortOrder: idx }));
    setTasks(moved);
    try {
      const res = await fetch("/api/tasks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: moved.map((task) => task.id) }),
      });
      const data = await parseApi<{ tasks: TaskItem[] }>(res);
      setTasks(sortTasks(data.tasks));
    } catch {
      setTasks(current);
      toast.error("Failed to save sort order.");
    }
  }

  async function enableNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted") setNotifyEnabled(true);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <header className="notebook-panel p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Task Notebook</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink">Welcome, {user.name}</h1>
            <p className="mt-2 text-sm text-muted">
              {orderedTasks.length} tasks • {orderedTasks.filter((task) => task.completed).length} completed
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <Link href="/profile" className="btn-secondary inline-flex items-center gap-2">
              <UserRoundCog className="h-4 w-4" />
              Profile
            </Link>
            <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          {editingTaskId && editDraft ? (
            <section className="notebook-panel p-5">
              <h2 className="text-lg font-semibold text-ink">Edit task</h2>
              <form className="mt-4 space-y-3" onSubmit={saveEdit}>
                <input
                  className="field"
                  value={editDraft.title}
                  onChange={(e) => setEditDraft((current) => (current ? { ...current, title: e.target.value } : current))}
                  required
                />
                <textarea
                  className="field min-h-[90px] resize-y"
                  value={editDraft.description}
                  onChange={(e) =>
                    setEditDraft((current) => (current ? { ...current, description: e.target.value } : current))
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="field"
                    value={editDraft.priority}
                    onChange={(e) =>
                      setEditDraft((current) =>
                        current ? { ...current, priority: e.target.value as TaskItem["priority"] } : current,
                      )
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <select
                    className="field"
                    value={editDraft.status}
                    onChange={(e) =>
                      setEditDraft((current) =>
                        current ? { ...current, status: e.target.value as TaskItem["status"] } : current,
                      )
                    }
                  >
                    <option value="todo">To do</option>
                    <option value="in_progress">In progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <input
                  className="field"
                  type="datetime-local"
                  value={editDraft.dueDate}
                  onChange={(e) => setEditDraft((current) => (current ? { ...current, dueDate: e.target.value } : current))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="field"
                    value={editDraft.categoryId}
                    onChange={(e) =>
                      setEditDraft((current) => (current ? { ...current, categoryId: e.target.value } : current))
                    }
                  >
                    <option value="">No category</option>
                    {categories.map((category) => (
                      <option value={category.id} key={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="field"
                    type="number"
                    min={5}
                    max={43200}
                    value={editDraft.reminderMinutes}
                    onChange={(e) =>
                      setEditDraft((current) =>
                        current ? { ...current, reminderMinutes: e.target.value } : current,
                      )
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1" disabled={busy}>
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setEditingTaskId(null);
                      setEditDraft(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <section className="notebook-panel p-5">
              <h2 className="text-lg font-semibold text-ink">Create task</h2>
              <form className="mt-4 space-y-3" onSubmit={createTask}>
                <input
                  className="field"
                  type="text"
                  placeholder="Task title"
                  value={draft.title}
                  onChange={(e) => setDraft((current) => ({ ...current, title: e.target.value }))}
                  required
                />
                <textarea
                  className="field min-h-[90px] resize-y"
                  placeholder="Description"
                  value={draft.description}
                  onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="field"
                    value={draft.priority}
                    onChange={(e) => setDraft((current) => ({ ...current, priority: e.target.value as TaskItem["priority"] }))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <select
                    className="field"
                    value={draft.status}
                    onChange={(e) => setDraft((current) => ({ ...current, status: e.target.value as TaskItem["status"] }))}
                  >
                    <option value="todo">To do</option>
                    <option value="in_progress">In progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <input
                  className="field"
                  type="datetime-local"
                  value={draft.dueDate}
                  onChange={(e) => setDraft((current) => ({ ...current, dueDate: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="field"
                    value={draft.categoryId}
                    onChange={(e) => setDraft((current) => ({ ...current, categoryId: e.target.value }))}
                  >
                    <option value="">No category</option>
                    {categories.map((category) => (
                      <option value={category.id} key={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="field"
                    type="number"
                    min={5}
                    max={43200}
                    placeholder="Reminder minutes"
                    value={draft.reminderMinutes}
                    onChange={(e) => setDraft((current) => ({ ...current, reminderMinutes: e.target.value }))}
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary inline-flex w-full items-center justify-center gap-2"
                  disabled={busy}
                >
                  <Plus className="h-4 w-4" />
                  Add task
                </button>
              </form>
            </section>
          )}

          <section className="notebook-panel p-5">
            <h2 className="text-lg font-semibold text-ink">Add category</h2>
            <form className="mt-4 grid grid-cols-[1fr_56px_auto] gap-2" onSubmit={createCategory}>
              <input
                className="field"
                placeholder="Category"
                value={newCategory.name}
                onChange={(e) => setNewCategory((current) => ({ ...current, name: e.target.value }))}
                required
              />
              <input
                className="field h-11 p-1"
                type="color"
                value={newCategory.color}
                onChange={(e) => setNewCategory((current) => ({ ...current, color: e.target.value }))}
              />
              <button type="submit" className="btn-primary px-4">
                Add
              </button>
            </form>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <select
                className="field"
                value={categoryToDelete}
                onChange={(e) => setCategoryToDelete(e.target.value)}
                disabled={categories.length === 0}
              >
                {categories.length === 0 ? (
                  <option value="">No categories</option>
                ) : (
                  categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                className="btn-secondary px-4 text-red-700 dark:text-red-300"
                onClick={() => void deleteCategoryFromForm()}
                disabled={categories.length === 0}
              >
                Delete
              </button>
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          <div className="notebook-panel p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <input className="field flex-1" placeholder="Search tasks" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="field md:w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
              <select className="field md:w-44" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-yellow-400/40 bg-yellow-50/70 p-3 text-sm">
                <p className="font-semibold text-yellow-800">Due soon: {dueSoon.length}</p>
                <p className="text-yellow-700">Within {user.reminderLeadMinutes} minutes</p>
              </div>
              <div className="rounded-xl border border-red-400/40 bg-red-50/70 p-3 text-sm">
                <p className="font-semibold text-red-800">Overdue: {overdue.length}</p>
                <p className="text-red-700">Needs immediate attention</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => void enableNotifications()}>
                <Bell className="h-4 w-4" />
                Browser reminders
              </button>
              <p className="text-xs text-muted">
                {canReorder ? "Drag tasks to sort." : "Clear filters and search to enable drag sorting."}
              </p>
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="notebook-panel p-8 text-center text-muted">No tasks found for current filters.</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void onDragEnd(event)}>
              <SortableContext
                items={(canReorder ? orderedTasks : filteredTasks).map((task) => task.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {(canReorder ? orderedTasks : filteredTasks).map((task) => (
                    <SortableTask
                      key={task.id}
                      task={task}
                      category={task.categoryId ? categoryMap.get(task.categoryId) : undefined}
                      reminderLeadMinutes={user.reminderLeadMinutes}
                      onToggle={toggleTask}
                      onEdit={startEdit}
                      onDelete={deleteTask}
                      disableDrag={!canReorder}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>
      </div>
    </main>
  );
}
