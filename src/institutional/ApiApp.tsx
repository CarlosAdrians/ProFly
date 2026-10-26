import { createBrowserRouter, RouterProvider } from 'react-router';
import { ApiSessionProvider } from './session';
import { apiRoutes } from './apiRoutes';
const router = createBrowserRouter(apiRoutes);
export function ApiApp() {
  return (
    <ApiSessionProvider>
      <RouterProvider router={router} />
    </ApiSessionProvider>
  );
}
