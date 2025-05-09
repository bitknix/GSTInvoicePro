declare module '@hookform/resolvers/zod' {
  import { Resolver } from 'react-hook-form';
  import { z, ZodSchema } from 'zod';
  
  export function zodResolver<T extends ZodSchema<unknown, unknown>>(schema: T): Resolver<z.infer<T>>;
} 