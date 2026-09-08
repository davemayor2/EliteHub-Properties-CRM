'use client';

import React, { useState } from 'react';
import { Tag, Building2, Edit2, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { ComplaintCategoryRecord } from '@/types/category';
import { DepartmentRecord } from '@/types/department';
import CategoryModal from './CategoryModal';

interface CategoryTableProps {
  initialCategories: ComplaintCategoryRecord[];
  departments: DepartmentRecord[];
}

export default function CategoryTable({
  initialCategories,
  departments,
}: CategoryTableProps) {
  const [categories, setCategories] = useState<ComplaintCategoryRecord[]>(initialCategories);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ComplaintCategoryRecord | null>(null);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: ComplaintCategoryRecord) => {
    setEditingCategory(cat);
    setModalOpen(true);
  };

  const handleSaveSuccess = (savedCat: ComplaintCategoryRecord) => {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === savedCat.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = savedCat;
        return next;
      }
      return [...prev, savedCat].sort(
        (a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)
      );
    });
  };

  const handleToggleStatus = async (cat: ComplaintCategoryRecord) => {
    const nextStatus = !cat.is_active;
    const confirmMsg = nextStatus
      ? `Activate category "${cat.name}"? It will become selectable on the public submission form.`
      : `Deactivate category "${cat.name}"? Customers will no longer see this option.`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/staff/categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.category) {
        handleSaveSuccess(data.category);
      } else {
        alert(data.message || 'Failed to update category status.');
      }
    } catch (err) {
      console.error('[Toggle Category Status Error]:', err);
      alert('Network error updating category status.');
    }
  };

  return (
    <div className="categories-management-container">
      {/* Top Action Bar */}
      <div className="table-controls-bar flex items-center justify-between gap-4">
        <div>
          <h3 className="section-card-title">Configured Complaint Categories</h3>
          <p className="section-card-subtitle">
            {categories.length} {categories.length === 1 ? 'category' : 'categories'} configured for customer classification
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="btn-primary-action"
        >
          <Plus size={15} />
          <span>Create Category</span>
        </button>
      </div>

      {/* Categories Table */}
      <div className="staff-section-card mt-4">
        {categories.length === 0 ? (
          <div className="table-empty-state">
            <div className="empty-icon-circle">
              <Tag size={28} />
            </div>
            <h4 className="empty-title">No Categories Created</h4>
            <p className="empty-description">
              Add complaint categories so customers can classify their submissions.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn-primary-action mt-3"
            >
              <Plus size={15} />
              <span>Create Category</span>
            </button>
          </div>
        ) : (
          <div className="table-responsive-container">
            <table className="staff-data-table" aria-label="Complaint categories table">
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Assigned Department</th>
                  <th scope="col">Description</th>
                  <th scope="col" className="text-center">Order</th>
                  <th scope="col" className="text-center">Status</th>
                  <th scope="col" className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const deptName = cat.department?.name || 'Unassigned';

                  return (
                    <tr key={cat.id} className="data-table-row">
                      {/* Name */}
                      <td className="cell-cat-name">
                        <div className="flex items-center gap-2 font-semibold text-gray-900">
                          <Tag size={15} className="text-muted shrink-0" />
                          <span>{cat.name}</span>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="cell-cat-dept">
                        <span className="dept-tag-pill">
                          <Building2 size={12} className="inline mr-1 text-emerald-700" />
                          {deptName}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="cell-cat-desc text-muted text-sm max-w-[260px] truncate">
                        {cat.description || <span className="italic text-xs">No description</span>}
                      </td>

                      {/* Order */}
                      <td className="cell-order text-center text-sm font-medium text-gray-600">
                        {cat.display_order}
                      </td>

                      {/* Status */}
                      <td className="cell-status text-center">
                        {cat.is_active ? (
                          <span className="status-badge-active">
                            <CheckCircle2 size={12} className="inline mr-1 text-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="status-badge-inactive">
                            <XCircle size={12} className="inline mr-1 text-gray-500" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="cell-actions text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cat)}
                            className="btn-table-action"
                            title="Edit category"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(cat)}
                            className={`btn-table-action-toggle ${
                              cat.is_active ? 'btn-deactivate' : 'btn-activate'
                            }`}
                            title={cat.is_active ? 'Deactivate category' : 'Activate category'}
                          >
                            {cat.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <CategoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSaveSuccess}
        category={editingCategory}
        departments={departments}
      />
    </div>
  );
}
