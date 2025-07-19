import React, { useState } from 'react';
import { NotificationFilters as FiltersType } from '../../services/notificationService';

interface NotificationFiltersProps {
  filters: FiltersType;
  onFilterChange: (filters: FiltersType) => void;
}

const NotificationFilters: React.FC<NotificationFiltersProps> = ({
  filters,
  onFilterChange
}) => {
  const [search, setSearch] = useState(filters.search || '');
  
  // Status filter options
  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'sent', label: 'Sent' },
    { value: 'failed', label: 'Failed' }
  ];
  
  // Type filter options
  const typeOptions = [
    { value: 'manual', label: 'Manual' },
    { value: 'auto', label: 'Auto' }
  ];
  
  // Target type filter options
  const targetTypeOptions = [
    { value: 'all', label: 'All Users' },
    { value: 'segment', label: 'Segment' },
    { value: 'specific_users', label: 'Specific Users' }
  ];
  
  // Handle status filter change
  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    let newStatuses = [...(filters.status || [])];
    
    if (checked) {
      newStatuses.push(value);
    } else {
      newStatuses = newStatuses.filter(status => status !== value);
    }
    
    onFilterChange({
      ...filters,
      status: newStatuses
    });
  };
  
  // Handle type filter change
  const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    let newTypes = [...(filters.type || [])];
    
    if (checked) {
      newTypes.push(value);
    } else {
      newTypes = newTypes.filter(type => type !== value);
    }
    
    onFilterChange({
      ...filters,
      type: newTypes
    });
  };
  
  // Handle target type filter change
  const handleTargetTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    let newTargetTypes = [...(filters.target_type || [])];
    
    if (checked) {
      newTargetTypes.push(value);
    } else {
      newTargetTypes = newTargetTypes.filter(targetType => targetType !== value);
    }
    
    onFilterChange({
      ...filters,
      target_type: newTargetTypes
    });
  };
  
  // Handle date from change
  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateFrom = e.target.value ? new Date(e.target.value) : undefined;
    
    onFilterChange({
      ...filters,
      date_from: dateFrom
    });
  };
  
  // Handle date to change
  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateTo = e.target.value ? new Date(e.target.value) : undefined;
    
    onFilterChange({
      ...filters,
      date_to: dateTo
    });
  };
  
  // Handle search
  const handleSearch = () => {
    onFilterChange({
      ...filters,
      search
    });
  };
  
  // Handle search key press
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    onFilterChange({
      page: 1,
      limit: filters.limit || 10
    });
  };
  
  // Format date for input
  const formatDate = (date?: Date): string => {
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="bg-base-200 p-4 rounded-lg mb-4">
      <h3 className="font-medium mb-3">Filters</h3>
      
      {/* Search */}
      <div className="mb-4">
        <div className="form-control">
          <div className="input-group">
            <input
              type="text"
              placeholder="Search notifications..."
              className="input input-bordered w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={handleSearchKeyPress}
            />
            <button className="btn btn-primary" onClick={handleSearch}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Filter groups */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status filter */}
        <div>
          <h4 className="text-sm font-medium mb-2">Status</h4>
          <div className="space-y-1">
            {statusOptions.map(option => (
              <div key={`status-${option.value}`} className="form-control">
                <label className="label cursor-pointer justify-start gap-2 py-0">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    value={option.value}
                    checked={(filters.status || []).includes(option.value)}
                    onChange={handleStatusChange}
                  />
                  <span className="label-text">{option.label}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
        
        {/* Type filter */}
        <div>
          <h4 className="text-sm font-medium mb-2">Type</h4>
          <div className="space-y-1">
            {typeOptions.map(option => (
              <div key={`type-${option.value}`} className="form-control">
                <label className="label cursor-pointer justify-start gap-2 py-0">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    value={option.value}
                    checked={(filters.type || []).includes(option.value)}
                    onChange={handleTypeChange}
                  />
                  <span className="label-text">{option.label}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
        
        {/* Target type filter */}
        <div>
          <h4 className="text-sm font-medium mb-2">Target Type</h4>
          <div className="space-y-1">
            {targetTypeOptions.map(option => (
              <div key={`target-type-${option.value}`} className="form-control">
                <label className="label cursor-pointer justify-start gap-2 py-0">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    value={option.value}
                    checked={(filters.target_type || []).includes(option.value)}
                    onChange={handleTargetTypeChange}
                  />
                  <span className="label-text">{option.label}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
        
        {/* Date filter */}
        <div>
          <h4 className="text-sm font-medium mb-2">Date Range</h4>
          <div className="space-y-2">
            <div className="form-control">
              <label className="label py-0">
                <span className="label-text">From</span>
              </label>
              <input
                type="date"
                className="input input-bordered input-sm w-full"
                value={formatDate(filters.date_from)}
                onChange={handleDateFromChange}
              />
            </div>
            <div className="form-control">
              <label className="label py-0">
                <span className="label-text">To</span>
              </label>
              <input
                type="date"
                className="input input-bordered input-sm w-full"
                value={formatDate(filters.date_to)}
                onChange={handleDateToChange}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Clear filters */}
      <div className="mt-4 flex justify-end">
        <button className="btn btn-sm btn-ghost" onClick={clearFilters}>
          Clear Filters
        </button>
      </div>
    </div>
  );
};

export default NotificationFilters;
