import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';

interface ModalProps {
  title: string; // para lectores de pantalla; cada modal pinta su propia cabecera
  onClose: () => void;
  padding?: string;
  children: React.ReactNode;
}

// Capa común de los modales del equipo sobre Radix Dialog: foco atrapado
// y devuelto al cerrar, Esc para cerrar, aria-modal y bloqueo del scroll.
// Se monta en un portal fuera de .cycler, así que repite la clase para
// heredar el reset de estilos.
export const Modal: React.FC<ModalProps> = ({ title, onClose, padding = 'p-4', children }) => (
  <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
    <Dialog.Portal>
      <Dialog.Overlay
        className={`cycler fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center select-none text-slate-100 ${padding}`}
      >
        <Dialog.Content aria-describedby={undefined} className="w-full flex justify-center outline-none">
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Portal>
  </Dialog.Root>
);
