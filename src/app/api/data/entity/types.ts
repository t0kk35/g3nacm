import { SectionConfig } from "@/lib/component-section/types";
import { TemplateContext } from "@/lib/component-section/types";

export type ComponentSection = {
    success: boolean;
    section_code: string;
    section_name: string;
    section_version: string;
    section_config: SectionConfig;
    context: TemplateContext;
    data_sources?: string[];
    errors?: any[];
    rendered_at: string;
}
