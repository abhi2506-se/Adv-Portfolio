import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailClient } from "@/components/projects/project-detail-client";
import { defaultPortfolioData } from "@/lib/portfolio-data";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalise(p: Record<string, any>) {
  const name = p.name || p.title || "";
  const tags = p.tags || p.tech || [];
  const github = p.github || p.repoUrl || "";
  const live = p.live || p.liveUrl || "";

  return {
    ...p,
    name,
    title: name,
    tags,
    tech: tags,
    repoUrl: github,
    liveUrl: live,
    github,
    live,
    slug: p.slug || slugify(name),
    longDescription: p.longDescription || p.description || "",
    description: p.description || "",
    featured: p.featured || false,
    status: p.status || "completed",
    features: p.features || [],
    caseStudy: p.caseStudy || null,
  };
}

type NormalisedProject = ReturnType<typeof normalise>;

async function getProjectData(
  slug: string
): Promise<NormalisedProject | null> {
  const normalizedRequestSlug = slugify(slug);

  try {
    const res = await fetch(`${BASE_URL}/api/portfolio-data`, {
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();

      const projects = data.projects || [];

      const found = projects.find((p: Record<string, any>) => {
        const name = p.name || p.title || "";
        const pSlug = p.slug || slugify(name);

        return (
          slugify(pSlug) === normalizedRequestSlug ||
          pSlug === slug
        );
      });

      if (found) {
        return normalise(found);
      }
    }
  } catch (error) {
    console.error("Portfolio API error:", error);
  }

  const fallback = (
    defaultPortfolioData.projects as Record<string, any>[]
  ).find((p) => {
    const name = p.name || p.title || "";
    const pSlug = p.slug || slugify(name);

    return (
      slugify(pSlug) === normalizedRequestSlug ||
      pSlug === slug
    );
  });

  return fallback ? normalise(fallback) : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const project = await getProjectData(slug);

  if (!project) {
    return {
      title: "Project Not Found | Abhishek Singh",
    };
  }

  const title = `${project.name} | Abhishek Singh — Portfolio`;

  const description =
    project.longDescription ||
    project.description ||
    `Explore the ${project.name} project.`;

  const url = `${BASE_URL}/projects/${slug}`;

  return {
    title,
    description,
    keywords: [
      ...project.tags,
      "project",
      "portfolio",
      "Abhishek Singh",
      "software engineer",
    ],
    authors: [{ name: "Abhishek Singh" }],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const project = await getProjectData(slug);

  if (!project) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <ProjectDetailClient
        project={project}
        slug={slug}
      />
    </main>
  );
}
