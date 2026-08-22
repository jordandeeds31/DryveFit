import { Readable } from "stream";
import { UploadApiErrorResponse, UploadApiResponse } from "cloudinary";
import prisma from "../../lib/prisma";
import cloudinary from "../../lib/cloudinary";
import AppError from "../../utils/AppError";

const BLOG_SELECT = {
  id: true,
  title: true,
  body: true,
  coverImageUrl: true,
  createdAt: true,
  userId: true,
  user: {
    select: {
      id: true,
      username: true,
      profileImageMimeType: true,
    },
  },
} as const;

type BlogPostWithAuthor = {
  id: string;
  title: string;
  body: string;
  coverImageUrl: string | null;
  createdAt: Date;
  userId: string;
  user: {
    id: string;
    username: string | null;
    profileImageMimeType: string | null;
  };
};

const toBlogPostResponse = (post: BlogPostWithAuthor, viewerId: string) => ({
  id: post.id,
  title: post.title,
  body: post.body,
  // Already a full, publicly-servable Cloudinary URL — same as Post's
  // mediaUrl, not routed through our own API.
  coverImageUrl: post.coverImageUrl,
  createdAt: post.createdAt,
  isOwnPost: post.userId === viewerId,
  author: {
    id: post.user.id,
    username: post.user.username,
    profileImageUrl: post.user.profileImageMimeType
      ? `/api/users/${post.user.id}/profile-image`
      : null,
  },
});

// Same stream-upload approach as posts.service.ts's uploadPostMedia —
// Cloudinary's SDK wants a stream, not a raw Buffer, and a dedicated
// "blog" folder keeps these assets separate from Feed post media.
const uploadBlogCoverImage = (
  buffer: Buffer,
): Promise<{ url: string; publicId: string }> =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "blog",
        resource_type: "image",
        transformation: [
          { width: 1200, height: 630, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload returned no result"));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );

    Readable.from(buffer).pipe(uploadStream);
  });

interface CreateBlogPostInput {
  userId: string;
  title: string;
  body: string;
  coverImageBuffer: Buffer | null;
}

export const createBlogPost = async ({
  userId,
  title,
  body,
  coverImageBuffer,
}: CreateBlogPostInput) => {
  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();

  if (!trimmedTitle) {
    throw new AppError(400, "A blog post needs a title");
  }
  if (!trimmedBody) {
    throw new AppError(400, "A blog post needs a body");
  }

  let coverImageUrl: string | null = null;
  let coverImagePublicId: string | null = null;

  if (coverImageBuffer) {
    try {
      const uploaded = await uploadBlogCoverImage(coverImageBuffer);
      coverImageUrl = uploaded.url;
      coverImagePublicId = uploaded.publicId;
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
      throw new AppError(502, "Couldn't upload the cover image — try again");
    }
  }

  const post = await prisma.blogPost.create({
    data: {
      userId,
      title: trimmedTitle,
      body: trimmedBody,
      coverImageUrl,
      coverImagePublicId,
    },
    select: BLOG_SELECT,
  });

  return toBlogPostResponse(post, userId);
};

export const getBlogPosts = async (viewerId: string) => {
  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    select: BLOG_SELECT,
  });

  return posts.map((post) => toBlogPostResponse(post, viewerId));
};

export const getBlogPost = async (viewerId: string, blogPostId: string) => {
  const post = await prisma.blogPost.findUnique({
    where: { id: blogPostId },
    select: BLOG_SELECT,
  });

  if (!post) {
    throw new AppError(404, "Blog post not found");
  }

  return toBlogPostResponse(post, viewerId);
};

export const deleteBlogPost = async (userId: string, blogPostId: string) => {
  const post = await prisma.blogPost.findFirst({
    where: { id: blogPostId, userId },
    select: { id: true, coverImagePublicId: true },
  });

  if (!post) {
    throw new AppError(404, "Blog post not found");
  }

  await prisma.blogPost.delete({ where: { id: blogPostId } });

  if (post.coverImagePublicId) {
    // Best-effort — the DB row is already gone (what the user actually
    // sees), so a Cloudinary hiccup here shouldn't surface as a failed
    // delete. Worst case an orphaned asset sits in storage.
    cloudinary.uploader
      .destroy(post.coverImagePublicId, { resource_type: "image" })
      .catch((err) => {
        console.warn(
          `Failed to delete Cloudinary asset ${post.coverImagePublicId}:`,
          err,
        );
      });
  }
};
