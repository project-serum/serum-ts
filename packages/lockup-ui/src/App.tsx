import React from 'react';
import { Provider } from 'react-redux';
import { HashRouter, Route } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { MuiThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import { unstable_createMuiStrictModeTheme as createMuiTheme } from '@material-ui/core/styles';
import { store } from './store';
import WalletProvider from './components/common/WalletProvider';
import BootstrapProvider from './components/common/BootstrapProvider';
import Layout from './components/common/Layout';
import MyNodePage from './pages/MyNode';

function App() {
  const theme = createMuiTheme({
    palette: {
      background: {
        default: 'rgb(255,255,255)',
      },
    },
    typography: {
      fontFamily: ['Source Sans Pro', 'sans-serif'].join(','),
    },
    overrides: {},
  });
  return (
    <Provider store={store}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider maxSnack={5} autoHideDuration={8000}>
          <WalletProvider>
            <BootstrapProvider>
              <HashRouter basename={'/'}>
                <Layout>
                  <Route exact path="/" component={MyNodePage} />
                </Layout>
              </HashRouter>
            </BootstrapProvider>
          </WalletProvider>
        </SnackbarProvider>
      </MuiThemeProvider>
    </Provider>
  );
}

export default App;
