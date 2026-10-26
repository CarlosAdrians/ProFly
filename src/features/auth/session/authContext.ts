import { createContext } from 'react';
import type { AuthContextValue } from './types';

export const AuthContext = createContext<AuthContextValue | null>(null);

/** Chave da sessão simulada no sessionStorage (encerra ao fechar a aba). */
export const SESSION_KEY = 'profly:session';
