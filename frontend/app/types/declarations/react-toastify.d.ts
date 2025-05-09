declare module 'react-toastify' {
  export const toast: {
    success(message: string, options?: unknown): void;
    error(message: string, options?: unknown): void;
    info(message: string, options?: unknown): void;
    warning(message: string, options?: unknown): void;
  };
  
  export interface ToastContainerProps {
    position?: string;
    autoClose?: number | false;
    hideProgressBar?: boolean;
    newestOnTop?: boolean;
    closeOnClick?: boolean;
    rtl?: boolean;
    pauseOnFocusLoss?: boolean;
    draggable?: boolean;
    pauseOnHover?: boolean;
    theme?: 'light' | 'dark' | 'colored';
  }
  
  export function ToastContainer(props: ToastContainerProps): JSX.Element;
} 