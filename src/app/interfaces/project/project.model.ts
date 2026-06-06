export interface Project {
  id:          string;
  name:        string;
  description: string | null;
  color:       string | null;
  icon:        string | null;
  userId:      string;
  createdAt:   string;
  updatedAt:   string;
  _count?: {
    tasks:   number;
    columns: number;
  };
}

export interface CreateProjectDto {
  name:         string;
  description?: string;
  color?:       string;
  icon?:        string;
}

export interface UpdateProjectDto {
  name?:        string;
  description?: string;
  color?:       string;
  icon?:        string;
}

export interface AiGenerateTasksDto {
  name?:            string;
  description:      string;
  includeSubtasks?: boolean;
}

export interface AiGenerateResponse {
  tasks: any[];
  aiUsage: {
    used:  number;
    limit: number;
  };
}
