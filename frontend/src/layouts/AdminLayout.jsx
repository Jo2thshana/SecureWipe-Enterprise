import React from 'react';
import { Outlet } from 'react-router-dom';
import RoleRoute from '../components/common/RoleRoute';

export default function AdminLayout() {
  return (
    <RoleRoute allowedRoles={['ADMIN']}>
      <Outlet />
    </RoleRoute>
  );
}
