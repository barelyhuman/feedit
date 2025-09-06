import { createContext, useContext, useState } from 'react';
import { Portal, Snackbar } from 'react-native-paper';

const ToastContext = createContext({
  visible: false,
  message: '',
  setMessage: (_: string) => {},
  setVisible: (_: boolean) => {},
});

export const useToast = () => {
  const { visible, message, setMessage, setVisible } = useContext(ToastContext);

  return {
    visible,
    message,
    show(_message: string) {
      setVisible(true);
      setMessage(_message);
      setTimeout(() => {
        setVisible(false);
        setMessage('');
      }, 3000);
    },
  };
};

export const ToastContainer = () => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <ToastContext.Provider
      value={{
        visible,
        setVisible,
        message,
        setMessage,
      }}
    >
      <Portal>
        <Snackbar
          onDismiss={() => {
            setVisible(false);
          }}
          visible={visible}
        >
          {message}
        </Snackbar>
      </Portal>
    </ToastContext.Provider>
  );
};
