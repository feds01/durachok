/* prettier-ignore-start */

/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file is auto-generated by TanStack Router

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as RegisterImport } from './routes/register'
import { Route as LogoutImport } from './routes/logout'
import { Route as LoginImport } from './routes/login'
import { Route as IndexImport } from './routes/index'
import { Route as UserIndexImport } from './routes/user/index'
import { Route as LobbyIndexImport } from './routes/lobby/index'
import { Route as UserSettingsImport } from './routes/user/settings'
import { Route as LobbyPinImport } from './routes/lobby/$pin'

// Create/Update Routes

const RegisterRoute = RegisterImport.update({
  path: '/register',
  getParentRoute: () => rootRoute,
} as any)

const LogoutRoute = LogoutImport.update({
  path: '/logout',
  getParentRoute: () => rootRoute,
} as any)

const LoginRoute = LoginImport.update({
  path: '/login',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const UserIndexRoute = UserIndexImport.update({
  path: '/user/',
  getParentRoute: () => rootRoute,
} as any)

const LobbyIndexRoute = LobbyIndexImport.update({
  path: '/lobby/',
  getParentRoute: () => rootRoute,
} as any)

const UserSettingsRoute = UserSettingsImport.update({
  path: '/user/settings',
  getParentRoute: () => rootRoute,
} as any)

const LobbyPinRoute = LobbyPinImport.update({
  path: '/lobby/$pin',
  getParentRoute: () => rootRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/login': {
      id: '/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof LoginImport
      parentRoute: typeof rootRoute
    }
    '/logout': {
      id: '/logout'
      path: '/logout'
      fullPath: '/logout'
      preLoaderRoute: typeof LogoutImport
      parentRoute: typeof rootRoute
    }
    '/register': {
      id: '/register'
      path: '/register'
      fullPath: '/register'
      preLoaderRoute: typeof RegisterImport
      parentRoute: typeof rootRoute
    }
    '/lobby/$pin': {
      id: '/lobby/$pin'
      path: '/lobby/$pin'
      fullPath: '/lobby/$pin'
      preLoaderRoute: typeof LobbyPinImport
      parentRoute: typeof rootRoute
    }
    '/user/settings': {
      id: '/user/settings'
      path: '/user/settings'
      fullPath: '/user/settings'
      preLoaderRoute: typeof UserSettingsImport
      parentRoute: typeof rootRoute
    }
    '/lobby/': {
      id: '/lobby/'
      path: '/lobby'
      fullPath: '/lobby'
      preLoaderRoute: typeof LobbyIndexImport
      parentRoute: typeof rootRoute
    }
    '/user/': {
      id: '/user/'
      path: '/user'
      fullPath: '/user'
      preLoaderRoute: typeof UserIndexImport
      parentRoute: typeof rootRoute
    }
  }
}

// Create and export the route tree

export const routeTree = rootRoute.addChildren({
  IndexRoute,
  LoginRoute,
  LogoutRoute,
  RegisterRoute,
  LobbyPinRoute,
  UserSettingsRoute,
  LobbyIndexRoute,
  UserIndexRoute,
})

/* prettier-ignore-end */

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/login",
        "/logout",
        "/register",
        "/lobby/$pin",
        "/user/settings",
        "/lobby/",
        "/user/"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/login": {
      "filePath": "login.tsx"
    },
    "/logout": {
      "filePath": "logout.tsx"
    },
    "/register": {
      "filePath": "register.tsx"
    },
    "/lobby/$pin": {
      "filePath": "lobby/$pin.tsx"
    },
    "/user/settings": {
      "filePath": "user/settings.tsx"
    },
    "/lobby/": {
      "filePath": "lobby/index.tsx"
    },
    "/user/": {
      "filePath": "user/index.tsx"
    }
  }
}
ROUTE_MANIFEST_END */
