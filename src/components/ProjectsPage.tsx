import * as React from "react";
import { Plus, SlidersHorizontal, Trash2 } from '@/lib/icons';
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { getProjectPreviewImages } from "@/src/lib/projectsStorage";

interface Project {
  id: string;
  title: string;
  date: string;
  image?: string;
  canvasJson?: string;
  editorSkillId?: string | null;
  editorDeepThink?: boolean;
}

interface ProjectsPageProps {
  projects?: Project[];
  onDeleteProject?: (id: string) => void;
  onNewProject?: () => void;
  onOpenProject?: (project: Project) => void;
  key?: string;
}

export function ProjectsPage({ projects = [], onDeleteProject, onNewProject, onOpenProject }: ProjectsPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-[1400px] px-12 pt-16 pb-12"
    >
      <div className="mb-10 flex items-center gap-4">
        <h1 className="text-3xl font-bold text-neutral-900">项目</h1>
        <button className="text-neutral-400 hover:text-neutral-900 transition-colors">
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {/* New Project Card */}
        <Card
          className="group cursor-pointer gap-0 rounded-lg border border-neutral-100 bg-white p-3 shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition-all hover:shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
          onClick={onNewProject}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNewProject?.();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="relative flex aspect-[1.4/1] w-full items-center justify-center overflow-hidden rounded-md bg-neutral-100/90 transition-colors group-hover:bg-neutral-100">
            <div className="flex flex-col items-center gap-3">
              <Plus className="h-9 w-9 text-neutral-700/80" />
              <p className="text-base font-semibold tracking-tight text-neutral-900">
                新建项目
              </p>
            </div>
          </div>
        </Card>

        {/* Project Cards */}
        {projects.map((project) => (
          <Card
            key={project.id}
            className="group cursor-pointer rounded-lg border border-neutral-100 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_10px_26px_rgba(15,23,42,0.08)]"
            onClick={() => onOpenProject?.(project)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenProject?.(project);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="relative aspect-[1.4/1] w-full overflow-hidden rounded-md bg-neutral-100/90 transition-all">
              {(() => {
                const thumbs = getProjectPreviewImages(project);
                if (thumbs.length >= 4) {
                  return (
                    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-[2px] bg-white/60">
                      {thumbs.slice(0, 4).map((src, i) => (
                        <img
                          key={`${project.id}-thumb-${i}`}
                          src={src}
                          alt=""
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ))}
                    </div>
                  );
                }
                if (thumbs.length > 0) {
                  return (
                    <img
                      src={thumbs[0]}
                      alt={project.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  );
                }
                return <div className="h-full w-full bg-neutral-50" />;
              })()}
              
              {/* Delete Button on Hover */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteProject?.(project.id);
                }}
                type="button"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md bg-neutral-700 text-white opacity-0 transition-all hover:bg-neutral-800 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3.5">
              <p className="line-clamp-1 text-base font-medium text-neutral-900">{project.title || "未命名"}</p>
              <p className="mt-1 text-sm text-neutral-400">更新于 {project.date}</p>
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
