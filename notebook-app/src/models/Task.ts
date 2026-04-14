import { type Document, type Model, Schema, model, models, type Types } from "mongoose";

export interface TaskDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  description: string;
  completed: boolean;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  dueDate: Date | null;
  completedAt: Date | null;
  reminderMinutes: number | null;
  categoryId: Types.ObjectId | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<TaskDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "done"],
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    reminderMinutes: {
      type: Number,
      default: null,
      min: 5,
      max: 43200,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

taskSchema.index({ userId: 1, sortOrder: 1 });

export const TaskModel: Model<TaskDocument> =
  (models.Task as Model<TaskDocument>) || model<TaskDocument>("Task", taskSchema);
