import { useEffect } from "react";

type Props = {
  title: string;
  description?: string;
};

export function Seo({ title, description }: Props) {
  useEffect(() => {
    document.title = title;
    if (!description) return;
    const meta = document.querySelector('meta[name="description"]');
    if (!meta) return;
    meta.setAttribute("content", description);
  }, [title, description]);

  return null;
}

