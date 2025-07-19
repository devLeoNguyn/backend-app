import React, { useState, useEffect } from 'react';
import { authService } from '../../services/authService';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/api';
import toast from 'react-hot-toast';
import { HiOutlinePencil, HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi';

interface NotificationTemplate {
  _id: string;
  name: string;
  title: string;
  body: string;
  type: string;
  target_type: string;
  deep_link?: string;
  image_url?: string;
  created_at: Date;
  updated_at: Date;
}

const NotificationTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    body: '',
    type: 'manual',
    target_type: 'all',
    deep_link: '',
    image_url: ''
  });

  // Current admin user
  const adminUser = authService.getCurrentUser();
  const adminUserId = adminUser?._id || '';

  // Fetch templates
  const fetchTemplates = async () => {
    if (!adminUserId) return;
    
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_ENDPOINTS.ADMIN_NOTIFICATIONS}/templates?userId=${adminUserId}`
      );
      
      if (response.data?.data?.templates) {
        setTemplates(response.data.data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load notification templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [adminUserId]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle template save
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminUserId) return;
    
    try {
      if (selectedTemplate) {
        // Update existing template
        await axios.put(
          `${API_ENDPOINTS.ADMIN_NOTIFICATIONS}/templates/${selectedTemplate._id}`,
          { ...formData, userId: adminUserId }
        );
        toast.success('Template updated successfully');
      } else {
        // Create new template
        await axios.post(
          `${API_ENDPOINTS.ADMIN_NOTIFICATIONS}/templates`,
          { ...formData, userId: adminUserId }
        );
        toast.success('Template created successfully');
      }
      
      // Reset form and refresh templates
      setShowForm(false);
      setSelectedTemplate(null);
      resetForm();
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  // Handle template edit
  const handleEditTemplate = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      title: template.title,
      body: template.body,
      type: template.type,
      target_type: template.target_type,
      deep_link: template.deep_link || '',
      image_url: template.image_url || ''
    });
    setShowForm(true);
  };

  // Handle template delete
  const handleDeleteTemplate = async (templateId: string) => {
    if (!adminUserId || !window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await axios.delete(
        `${API_ENDPOINTS.ADMIN_NOTIFICATIONS}/templates/${templateId}`,
        { data: { userId: adminUserId } }
      );
      
      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      title: '',
      body: '',
      type: 'manual',
      target_type: 'all',
      deep_link: '',
      image_url: ''
    });
  };

  // Handle cancel
  const handleCancel = () => {
    setShowForm(false);
    setSelectedTemplate(null);
    resetForm();
  };

  if (loading && templates.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="bg-base-100 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Notification Templates</h2>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowForm(true)}
          disabled={showForm}
        >
          <HiOutlinePlus className="mr-1" /> New Template
        </button>
      </div>

      {showForm ? (
        <div className="bg-base-200 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {selectedTemplate ? 'Edit Template' : 'New Template'}
          </h3>
          <form onSubmit={handleSaveTemplate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Template Name</span>
                </label>
                <input
                  type="text"
                  name="name"
                  className="input input-bordered"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="E.g., New Movie Announcement"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Notification Type</span>
                </label>
                <select
                  name="type"
                  className="select select-bordered"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="manual">Manual</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Notification Title</span>
              </label>
              <input
                type="text"
                name="title"
                className="input input-bordered"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="E.g., New Movie Released!"
                maxLength={100}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Notification Body</span>
              </label>
              <textarea
                name="body"
                className="textarea textarea-bordered h-24"
                value={formData.body}
                onChange={handleChange}
                required
                placeholder="E.g., Check out our latest movie release..."
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Target Type</span>
                </label>
                <select
                  name="target_type"
                  className="select select-bordered"
                  value={formData.target_type}
                  onChange={handleChange}
                >
                  <option value="all">All Users</option>
                  <option value="segment">Segment</option>
                  <option value="specific_users">Specific Users</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Deep Link (Optional)</span>
                </label>
                <input
                  type="text"
                  name="deep_link"
                  className="input input-bordered"
                  value={formData.deep_link}
                  onChange={handleChange}
                  placeholder="E.g., movie/123"
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Image URL (Optional)</span>
              </label>
              <input
                type="text"
                name="image_url"
                className="input input-bordered"
                value={formData.image_url}
                onChange={handleChange}
                placeholder="E.g., https://example.com/image.jpg"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                {selectedTemplate ? 'Update Template' : 'Save Template'}
              </button>
            </div>
          </form>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No notification templates found.</p>
          <button
            className="btn btn-primary btn-sm mt-4"
            onClick={() => setShowForm(true)}
          >
            Create your first template
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Title</th>
                <th>Type</th>
                <th>Target</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(template => (
                <tr key={template._id}>
                  <td>{template.name}</td>
                  <td className="max-w-[200px] truncate">{template.title}</td>
                  <td>{template.type}</td>
                  <td>{template.target_type}</td>
                  <td>
                    <div className="flex space-x-2">
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <HiOutlinePencil />
                      </button>
                      <button
                        className="btn btn-xs btn-ghost text-error"
                        onClick={() => handleDeleteTemplate(template._id)}
                      >
                        <HiOutlineTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default NotificationTemplates;
