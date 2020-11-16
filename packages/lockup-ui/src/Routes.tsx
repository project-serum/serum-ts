import React from 'react';
import { HashRouter, Route } from 'react-router-dom';
import Layout from './Layout';
import NewVestingAccount from './pages/NewVestingAccount';
import VestingAccounts from './pages/VestingAccounts';

export default function Routes() {
  return (
    <React.Fragment>
      <HashRouter basename={'/'}>
        <Layout>
          <Route exact path="/new" component={NewVestingAccount} />
          <Route exact path="/" component={VestingAccounts} />
        </Layout>
      </HashRouter>
    </React.Fragment>
  );
}
