import { NextResponse } from 'next/server';

type ErrorPayload = {
  error: string;
};

type SuccessOptions = {
  status?: number;
};

type ErrorOptions = {
  status?: number;
};

export function ok<T>(data: T, options: SuccessOptions = {}) {
  const { status = 200 } = options;
  return NextResponse.json({ data }, { status });
}

export function error(message: string, options: ErrorOptions = {}) {
  const { status = 500 } = options;
  return NextResponse.json({ error: message } satisfies ErrorPayload, { status });
}

export function badRequest(message: string) {
  return error(message, { status: 400 });
}

export function unauthorized(message = 'Unauthorized.') {
  return error(message, { status: 401 });
}

export function forbidden(message = 'Forbidden.') {
  return error(message, { status: 403 });
}

export function notFound(message: string) {
  return error(message, { status: 404 });
}

export function serverError(message = 'Erro interno do servidor.') {
  return error(message, { status: 500 });
}
