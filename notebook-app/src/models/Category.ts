import { type Document, type Model, Schema, model, models, type Types } from "mongoose";

export interface CategoryDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    color: {
      type: String,
      default: "#2d7f5e",
      trim: true,
      maxlength: 20,
    },
  },
  {
    timestamps: true,
  },
);

categorySchema.index({ userId: 1, name: 1 }, { unique: true });

export const CategoryModel: Model<CategoryDocument> =
  (models.Category as Model<CategoryDocument>) ||
  model<CategoryDocument>("Category", categorySchema);
