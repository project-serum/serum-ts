import React, { PropsWithChildren, ReactElement } from 'react';
import { Link } from 'react-router-dom';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import Avatar from '@material-ui/core/Avatar';
import { WalletConnectButton } from './components/Wallet';

type Props = {};

export default function Layout(props: PropsWithChildren<Props>) {
	return (
		<React.Fragment>
			<Nav>
				{props.children}
			</Nav>
		</React.Fragment>
	);
}


function Nav(props: PropsWithChildren<Props>): ReactElement {
	return (
		<div style={{display : 'flex', flexDirection: 'column', }}>
			<AppBar position="static">
				<Toolbar>
					<div style={{
						display: 'flex',
						justifyContent: 'space-between',
						width: '100%',
					}}>
						<Link to={'/'} style={{ color: 'inherit', textDecoration: 'none' }}>
							<div style={{ display: 'flex' }}>
								<div style={{
									display: 'flex',
									flexDirection: 'column',
									justifyContent: 'center',
									marginRight: '24px',
								}}>
									<Avatar alt="Logo" src="http://github.com/project-serum/awesome-serum/blob/master/logo-serum.png?raw=true" />
								</div>
								<IconButton color="inherit" edge="start">
									<Typography variant="h6">
										Vesting Accounts
									</Typography>
								</IconButton>
							</div>
						</Link>
						<WalletConnectButton />
					</div>
				</Toolbar>
			</AppBar>
			<div>
				{props.children}
			</div>
		</div>
	);
}
