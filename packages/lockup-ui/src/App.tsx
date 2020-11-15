import React, { useMemo, Suspense } from 'react';
import { Provider } from 'react-redux';
import CssBaseline from '@material-ui/core/CssBaseline';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import {
  ThemeProvider,
  unstable_createMuiStrictModeTheme as createMuiTheme,
} from '@material-ui/core/styles';
import { SnackbarProvider } from 'notistack';
import Routes from './Routes';
import { store } from './store';
import { WalletProvider } from './components/Wallet';

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
	const theme = useMemo(
    () =>
      createMuiTheme({
        palette: {
          type: prefersDarkMode ? 'dark' : 'light',
        },
      }),
    [prefersDarkMode],
  );
  return (
		<Provider store={store}>
			<Suspense fallback={<div></div>}>
				<ThemeProvider theme={theme}>
					<CssBaseline />
          <SnackbarProvider maxSnack={5} autoHideDuration={8000}>
						<WalletProvider>
							<Routes />
						</WalletProvider>
					</SnackbarProvider>
				</ThemeProvider>
			</Suspense>
		</Provider>
  );
}

export default App;
