import {
  formatName,
  NODE_DEFINITIONS,
  SearchBox,
} from '@/shared';
import { useFlowStore } from '@/store';
import { BugIcon, ChevronLeft, SearchX } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ENavigationType,
  NavItem,
  NodeTemplate,
  WorkflowNodesCategory,
} from '../../types';
import { PopoverItem } from '../popovers/PopoverItem';
import WorkflowIcon from '../canvas/WorkflowIcon';
import { CategoryTypes, NodeTypeProps } from '@/shared/constants/enums';

interface NodePickerPanelProps {
  id: string;
  isStartNode?: boolean;
}

export default function NodePickerPanel({
  id,
  isStartNode = false,
}: NodePickerPanelProps) {
  const {
    updateNode,
    setActiveNode,
    nodeCategories,
    categoryMeta,
  } = useFlowStore();

  const panelRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  /* -------------------------------------------------------------
     Memoized filtered categories for start node
  ------------------------------------------------------------- */
  const nodeCategory = useMemo(
    () =>
      isStartNode
        ? nodeCategories.filter((n) => n.name === 'trigger')
        : nodeCategories,
    [isStartNode, nodeCategories],
  );

  /* -------------------------------------------------------------
     Navigation stack with initial state factory
  ------------------------------------------------------------- */
  const [navigationStack, setNavigationStack] = useState<NavItem[]>(() => {
    return isStartNode
      ? [
          { type: ENavigationType.Root, data: nodeCategory },
          { type: ENavigationType.Category, data: nodeCategory[0] },
        ]
      : [{ type: ENavigationType.Root, data: nodeCategory }];
  });

  const currentView = navigationStack[navigationStack.length - 1];

  /* -------------------------------------------------------------
     Memoized category style lookup
  ------------------------------------------------------------- */
  const resolvedStyle = useMemo(() => {
    if (
      (currentView.type === ENavigationType.Category ||
        currentView.type === ENavigationType.SubCategory) &&
      currentView.data
    ) {
      const style = categoryMeta.get(
        (currentView.data.name as CategoryTypes) ?? ('' as CategoryTypes),
      );
      return (
        style || {
          icon: BugIcon,
          color: 'bg-gray-300',
          border: 'border-gray-500',
        }
      );
    }
    return {
      icon: BugIcon,
      color: 'bg-gray-300',
      border: 'border-gray-500',
    };
  }, [currentView.type, currentView.data, categoryMeta]);

  /* -------------------------------------------------------------
     Memoized search utility
  ------------------------------------------------------------- */
  const matchesSearch = useCallback(
    (
      item: { name: string; description?: string; visibility?: boolean },
      query: string,
    ): boolean => {
      if (!query.trim() || item.visibility === false) return false;
      const q = query.toLowerCase().trim();
      const nameMatch = item.name?.toLowerCase().includes(q);
      const descMatch = !!item.description?.toLowerCase().includes(q);
      return nameMatch || descMatch;
    },
    [],
  );

  /* -------------------------------------------------------------
     Memoized template flattening functions
  ------------------------------------------------------------- */
  const flattenTemplates = useCallback(
    (categories: WorkflowNodesCategory[]): NodeTemplate[] => {
      const templates: NodeTemplate[] = [];

      const extract = (cat: WorkflowNodesCategory) => {
        if (cat.nodeTemplates && cat.nodeTemplates.length > 0) {
          templates.push(
            ...cat.nodeTemplates.filter((t) => t.visibility !== false),
          );
        }
        if (cat.subCategories && cat.subCategories.length > 0) {
          cat.subCategories.forEach(extract);
        }
      };

      categories.forEach(extract);
      return templates;
    },
    [],
  );

  const flattenCategoryTemplates = useCallback(
    (category: WorkflowNodesCategory): NodeTemplate[] => {
      const templates: NodeTemplate[] = [];

      const extract = (cat: WorkflowNodesCategory) => {
        if (cat.nodeTemplates && cat.nodeTemplates.length > 0) {
          templates.push(
            ...cat.nodeTemplates.filter((t) => t.visibility !== false),
          );
        }
        if (cat.subCategories && cat.subCategories.length > 0) {
          cat.subCategories.forEach(extract);
        }
      };

      extract(category);
      return templates;
    },
    [],
  );

  /* -------------------------------------------------------------
     Memoized navigation handlers
  ------------------------------------------------------------- */
  const goBack = useCallback(() => {
    setNavigationStack((stack) => stack.slice(0, -1));
    setSearchQuery('');
  }, []);

  const navigateToCategory = useCallback((category: WorkflowNodesCategory) => {
    setNavigationStack((stack) => [
      ...stack,
      { type: ENavigationType.Category, data: category },
    ]);
    setSearchQuery('');
  }, []);

  const navigateToSubCategory = useCallback(
    (subCategory: WorkflowNodesCategory) => {
      setNavigationStack((stack) => [
        ...stack,
        { type: ENavigationType.SubCategory, data: subCategory },
      ]);
      setSearchQuery('');
    },
    [],
  );

  /* -------------------------------------------------------------
     Memoized template selection handler
  ------------------------------------------------------------- */
  const selectTemplate = useCallback(
    (template: NodeTemplate) => {
      const nodeType = template.type as NodeTypeProps;
      const outputs = NODE_DEFINITIONS[nodeType].outputs || ['none'];

      updateNode(id, {
        name: template.name,
        templateId: template.id,
        type: nodeType,
        // icon: Icon,
        description: template.description,
        outputs,
      });

      setNavigationStack([{ type: ENavigationType.Root, data: nodeCategory }]);
      setSearchQuery('');
    },
    [id, nodeCategory, updateNode],
  );

  /* -------------------------------------------------------------
     Click outside handler with proper cleanup
  ------------------------------------------------------------- */
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as HTMLElement)
      ) {
        setActiveNode(null);
        setNavigationStack([
          { type: ENavigationType.Root, data: nodeCategory },
        ]);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [nodeCategory, setActiveNode]);

  /* -------------------------------------------------------------
     Memoized search query check
  ------------------------------------------------------------- */
  const hasSearchQuery = useMemo(
    () => searchQuery.trim().length > 0,
    [searchQuery],
  );

  /* -------------------------------------------------------------
     Memoized render functions
  ------------------------------------------------------------- */
  const renderRootView = useMemo(() => {
    if (currentView.type !== ENavigationType.Root || hasSearchQuery) {
      return null;
    }

    return currentView.data
      .filter((cat) => cat.visibility !== false)
      .map((category) => (
        <PopoverItem
          key={category.id}
          category={category}
          onClick={() => navigateToCategory(category)}
        />
      ));
  }, [currentView, hasSearchQuery, navigateToCategory]);

  const renderGlobalSearch = useMemo(() => {
    if (!hasSearchQuery || currentView.type !== ENavigationType.Root) {
      return null;
    }

    const results: React.ReactNode[] = [];
    const addedTemplateIds = new Set<string>();

    // Search for matching categories
    const matchingCategories = currentView.data.filter(
      (cat) => cat.visibility !== false && matchesSearch(cat, searchQuery),
    );

    results.push(
      ...matchingCategories.map((category) => (
        <PopoverItem
          key={`cat-${category.id}`}
          category={category}
          onClick={() => navigateToCategory(category)}
        />
      )),
    );

    // Search for all matching templates
    const allTemplates = flattenTemplates(nodeCategory);
    const matchingTemplates = allTemplates.filter(
      (template) =>
        !addedTemplateIds.has(template.id) &&
        matchesSearch(template, searchQuery),
    );

    results.push(
      ...matchingTemplates.map((template) => {
        addedTemplateIds.add(template.id);
        return (
          <PopoverItem
            key={`tpl-${template.id}`}
            category={template}
            onClick={() => selectTemplate(template)}
          />
        );
      }),
    );

    if (results.length === 0) {
      return (
        <div className="wf-node-picker__empty">
          <SearchX className="wf-node-picker__empty-icon" />
          <div className="wf-node-picker__empty-title">No nodes found</div>
          <div className="wf-node-picker__empty-sub">
            Try a different keyword.
          </div>
        </div>
      );
    }

    return results;
  }, [
    hasSearchQuery,
    currentView,
    searchQuery,
    nodeCategory,
    matchesSearch,
    flattenTemplates,
    navigateToCategory,
    selectTemplate,
  ]);

  const renderCategoryView = useMemo(() => {
    if (currentView.type !== ENavigationType.Category) {
      return null;
    }

    const category = currentView.data;
    const results: React.ReactNode[] = [];
    const addedTemplateIds = new Set<string>();

    if (hasSearchQuery) {
      // Show matching subcategories
      if (category.subCategories && category.subCategories.length > 0) {
        const matchingSubCats = category.subCategories.filter(
          (subCat) =>
            subCat.visibility !== false && matchesSearch(subCat, searchQuery),
        );

        results.push(
          ...matchingSubCats.map((subCat) => (
            <PopoverItem
              key={`subcat-${subCat.id}`}
              category={subCat}
              onClick={() =>
                subCat.subCategories && subCat.subCategories.length > 0
                  ? navigateToCategory(subCat)
                  : navigateToSubCategory(subCat)
              }
            />
          )),
        );
      }

      // Search nested templates
      const allNestedTemplates = flattenCategoryTemplates(category);
      const matchingTemplates = allNestedTemplates.filter(
        (template) =>
          !addedTemplateIds.has(template.id) &&
          matchesSearch(template, searchQuery),
      );

      results.push(
        ...matchingTemplates.map((template) => {
          addedTemplateIds.add(template.id);
          return (
            <PopoverItem
              key={`tpl-${template.id}`}
              category={template}
              onClick={() => selectTemplate(template)}
            />
          );
        }),
      );
    } else {
      // Show direct templates and subcategories
      if (category.nodeTemplates && category.nodeTemplates.length > 0) {
        results.push(
          ...category.nodeTemplates
            .filter((t) => t.visibility !== false)
            .map((template) => (
              <PopoverItem
                key={template.id}
                category={template}
                onClick={() => selectTemplate(template)}
              />
            )),
        );
      }

      if (category.subCategories && category.subCategories.length > 0) {
        results.push(
          ...category.subCategories
            .filter((c) => c.visibility !== false)
            .map((subCat) => (
              <PopoverItem
                key={subCat.id}
                category={subCat}
                onClick={() =>
                  subCat.subCategories && subCat.subCategories.length > 0
                    ? navigateToCategory(subCat)
                    : navigateToSubCategory(subCat)
                }
              />
            )),
        );
      }
    }

    if (results.length === 0 && hasSearchQuery) {
      return (
        <div className="wf-node-picker__empty">
          <SearchX className="wf-node-picker__empty-icon" />
          <div className="wf-node-picker__empty-title">No nodes found</div>
          <div className="wf-node-picker__empty-sub">
            Try a different keyword.
          </div>
        </div>
      );
    }

    return results;
  }, [
    currentView,
    hasSearchQuery,
    searchQuery,
    matchesSearch,
    flattenCategoryTemplates,
    navigateToCategory,
    navigateToSubCategory,
    selectTemplate,
  ]);

  const renderSubCategoryView = useMemo(() => {
    if (currentView.type !== ENavigationType.SubCategory) {
      return null;
    }

    const sub = currentView.data;

    if (!hasSearchQuery) {
      return (sub.nodeTemplates ?? [])
        .filter((t) => t.visibility !== false)
        .map((template) => (
          <PopoverItem
            key={template.id}
            category={template}
            onClick={() => selectTemplate(template)}
          />
        ));
    }

    const matchingTemplates = (sub.nodeTemplates ?? []).filter(
      (template) =>
        template.visibility !== false && matchesSearch(template, searchQuery),
    );

    if (matchingTemplates.length === 0) {
      return (
        <div className="wf-node-picker__empty">
          <SearchX className="wf-node-picker__empty-icon" />
          <div className="wf-node-picker__empty-title">No nodes found</div>
          <div className="wf-node-picker__empty-sub">
            Try a different keyword.
          </div>
        </div>
      );
    }

    return matchingTemplates.map((template) => (
      <PopoverItem
        key={template.id}
        category={template}
        onClick={() => selectTemplate(template)}
      />
    ));
  }, [currentView, hasSearchQuery, searchQuery, matchesSearch, selectTemplate]);

  /* -------------------------------------------------------------
     Memoized header title
  ------------------------------------------------------------- */
  const headerTitle = useMemo(
    () =>
      formatName(
        currentView.type === ENavigationType.Root
          ? 'Nodes Category'
          : (currentView.data.name ?? 'Nodes Category'),
      ),
    [currentView],
  );

  /* -------------------------------------------------------------
     Memoized search change handler
  ------------------------------------------------------------- */
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [],
  );

  /* -------------------------------------------------------------
     JSX
  ------------------------------------------------------------- */
  return (
    <div ref={panelRef} className="wf-node-picker">
      <div className="wf-node-picker__header">
        {navigationStack.length > 1 && !isStartNode && (
          <button onClick={goBack} className="wf-node-picker__back">
            <ChevronLeft className="wf-icon-md" />
          </button>
        )}
        {headerTitle}
      </div>

      {/* Category Summary Header */}
      {currentView.type !== ENavigationType.Root && (
        <div className="wf-node-picker__body">
          <div
            className="wf-node-picker__summary"
            style={{
              background: `${resolvedStyle.color}20`,
              borderColor: resolvedStyle.border ?? resolvedStyle.color,
            }}
          >
            <div
              className="wf-node-picker__summary-icon"
              style={{ background: resolvedStyle.color }}
            >
              <WorkflowIcon
                nodeType={currentView.data.name as CategoryTypes}
                isCategory
                className="text-white w-8 h-8"
                size={30}
              />
            </div>

            <span className="wf-node-picker__summary-title">
              {currentView.data.name}
            </span>
          </div>
        </div>
      )}

      <SearchBox
        placeholder="Search Nodes"
        value={searchQuery}
        onChange={handleSearchChange}
      />

      <div className="wf-node-picker__list wf-scroll-hide">
        {currentView.type === ENavigationType.Root &&
          hasSearchQuery &&
          renderGlobalSearch}

        {currentView.type === ENavigationType.Root &&
          !hasSearchQuery &&
          renderRootView}

        {currentView.type === ENavigationType.Category && renderCategoryView}
        {currentView.type === ENavigationType.SubCategory &&
          renderSubCategoryView}
      </div>
    </div>
  );
}