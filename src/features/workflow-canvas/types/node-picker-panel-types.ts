export interface TemplateMeta {
  icon?: string;
  color: string;
  border: string;
  request?: object;
  response?: object;
}

export interface NodeTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  categoryId: string;
  metadata: TemplateMeta | null;
  visibility: boolean;
}

// Category + SubCategory structure
export interface WorkflowNodesCategory {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  order: number;
  parentId: string | null;
  icon: string | null;
  visibility: boolean;
  subCategories: WorkflowNodesCategory[];
  nodeTemplates: NodeTemplate[];
}

/* -------------------------------------------------------------
   Navigation Types — strict, safe, fully typed
------------------------------------------------------------- */
export enum ENavigationType {
  Root = 'root',
  Category = 'category',
  SubCategory = 'subcategory',
}

type RootNav = {
  type: ENavigationType.Root;
  data: WorkflowNodesCategory[];
};

type CategoryNav = {
  type: ENavigationType.Category;
  data: WorkflowNodesCategory;
};

type SubCategoryNav = {
  type: ENavigationType.SubCategory;
  data: WorkflowNodesCategory;
};

export type NavItem = RootNav | CategoryNav | SubCategoryNav;

export type WorkflowCategoryList = WorkflowNodesCategory[];


export interface SearchableItem {
  id: string;
  name: string;
  description?: string;
  visibility?: boolean;
}

