import React from 'react';
import { useSelector } from 'react-redux';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { accounts } from '@project-serum/registry';
import { State as StoreState, ProgramAccount } from '../store/reducer';

export default function Me() {
  const { member } = useSelector((state: StoreState) => {
    return {
      member: state.registry.member,
    };
  });

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <div style={{ flex: 1, marginTop: '24px', marginBottom: '24px' }}>
        {member && <MemberBalancesCard member={member} />}
      </div>
    </div>
  );
}

type MemberBalancesCardProps = {
  member: ProgramAccount<accounts.Member>;
};

function MemberBalancesCard(props: MemberBalancesCardProps) {
  const { member } = props;
  const rows = [
    {
      token: 'SRM',
      balance: member.account.balances.currentDeposit.toString(),
    },
    {
      token: 'MSRM',
      balance: member.account.balances.currentMegaDeposit.toString(),
    },
  ];
  const lockedRows = [
    {
      token: 'SRM',
      balance: member.account.balances.delegate.deposit.toString(),
    },
    {
      token: 'MSRM',
      balance: member.account.balances.delegate.megaDeposit.toString(),
    },
  ];
  const unlockedRows = [
    {
      token: 'SRM',
      balance: member.account.balances.main.deposit.toString(),
    },
    {
      token: 'MSRM',
      balance: member.account.balances.main.megaDeposit.toString(),
    },
  ];
  const poolRows = [
    {
      pool: 'Stake Pool',
      account: member.account.spt.toString(),
      shares: member.account.balances.sptAmount.toString(),
    },
    {
      pool: 'Mega Stake Pool',
      account: member.account.sptMega.toString(),
      shares: member.account.balances.sptMegaAmount.toString(),
    },
  ];
  return (
    <Card
      style={{
        marginBottom: '24px',
      }}
    >
      <CardHeader
        title={'My Membership'}
        subheader={member.publicKey.toString()}
      />
      <CardContent
        style={{
          position: 'relative',
          paddingTop: 0,
          paddingBottom: '16px',
        }}
      >
        <div>
          <Typography style={{ fontWeight: 'bold' }}>
            Stake Pool Shares
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Pool</TableCell>
                  <TableCell align="left">Account</TableCell>
                  <TableCell align="right">Shares</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {poolRows.map(row => (
                  <TableRow key={row.pool}>
                    <TableCell component="th" scope="row">
                      {row.pool}
                    </TableCell>
                    <TableCell align="left">
                      <div style={{ width: '180px', overflowX: 'hidden' }}>
                        {row.account}
                      </div>
                    </TableCell>
                    <TableCell align="right">{row.shares}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
        <div style={{ marginTop: '16px', marginBottom: '40px' }}>
          <Typography style={{ fontWeight: 'bold' }}>
            Available Balances
          </Typography>
          <Typography color="textSecondary" style={{ fontSize: '14px' }}>
            Total balances available for staking.
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Token</TableCell>
                  <TableCell align="right">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(row => (
                  <TableRow key={row.token}>
                    <TableCell component="th" scope="row">
                      {row.token}
                    </TableCell>
                    <TableCell align="right">{row.balance}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
        <div style={{ marginTop: '16px', marginBottom: '40px' }}>
          <Typography style={{ fontWeight: 'bold' }}>
            Locked Deposits
          </Typography>
          <Typography color="textSecondary" style={{ fontSize: '14px' }}>
            Locked deposits are funds transferred from the lockup program. These
            funds cannot be withdrawn directly, but instead, must be withdrawn
            back to a locked account.
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Token</TableCell>
                  <TableCell align="right">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lockedRows.map(row => (
                  <TableRow key={row.token}>
                    <TableCell component="th" scope="row">
                      {row.token}
                    </TableCell>
                    <TableCell align="right">{row.balance}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
        <div style={{ marginTop: '16px', marginBottom: '40px' }}>
          <Typography style={{ fontWeight: 'bold' }}>
            Unlocked Deposits
          </Typography>
          <Typography color="textSecondary" style={{ fontSize: '14px' }}>
            Unlocked deposits are funds not transferred from the lockup program,
            and so can be withdrawn freely, if not staked.
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Token</TableCell>
                  <TableCell align="right">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unlockedRows.map(row => (
                  <TableRow key={row.token}>
                    <TableCell component="th" scope="row">
                      {row.token}
                    </TableCell>
                    <TableCell align="right">{row.balance}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      </CardContent>
    </Card>
  );
}
