import { createDocs } from "@ariadocs/react";
import {
  remarkGfm,
  rehypePrism,
  rehypeSlug,
  rehypeAutolinkHeadings,
  rehypeCodeTitles,
} from "@ariadocs/react/plugins";

export const docs = createDocs({
  contentDir: "contents/docs",
  remarkPlugins: [remarkGfm],
  rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings, rehypeCodeTitles, rehypePrism],
});
