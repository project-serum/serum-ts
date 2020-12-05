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
import CircularProgress from '@material-ui/core/CircularProgress';
import { accounts } from '@project-serum/registry';
import { ProgramAccount } from '@project-serum/common';
import { State as StoreState, AsyncData } from '../store/reducer';

export default function Me() {
  const { member } = useSelector((state: StoreState) => {
    return {
      member: state.registry.member,
    };
  });

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <div style={{ flex: 1, marginTop: '24px', marginBottom: '24px' }}>
        {member.isReady && member.data !== undefined && (
          <MemberBalancesCard member={member} />
        )}
      </div>
    </div>
  );
}

type MemberBalancesCardProps = {
  member: AsyncData<ProgramAccount<accounts.MemberDeref>>;
};

function MemberBalancesCard(props: MemberBalancesCardProps) {
  const { member } = props;
  const tables = [
    {
      title: 'Main Balances',
      description: 'Balances transferred directly.',
      rows:
        !member.isReady || member.data === undefined
          ? null
          : [
              {
                token: 'SRM',
                balance: member.data!.account.balances[0]!.vault.amount.toString(),
                stake: member.data!.account.balances[0].vaultStake.amount.toString(),
                spt: member.data!.account.balances[0].spt.amount.toString(),
                pending: member.data!.account.balances[0].vaultPendingWithdrawal.amount.toString(),
              },
              {
                token: 'MSRM',
                balance: member.data!.account.balances[0].vaultMega.amount.toString(),
                stake: member.data!.account.balances[0].vaultStakeMega.amount.toString(),
                spt: member.data!.account.balances[0].sptMega.amount.toString(),
                pending: member.data!.account.balances[0].vaultPendingWithdrawalMega.amount.toString(),
              },
            ],
    },
    {
      title: 'Locked Balances',
      description: 'Total balances transferred from the lockup program.',
      rows:
        !member.isReady || member.data === undefined
          ? null
          : [
              {
                token: 'SRM',
                balance: member.data!.account.balances[1].vault.amount.toString(),
                stake: member.data!.account.balances[1].vaultStake.amount.toString(),
                spt: member.data!.account.balances[1].spt.amount.toString(),
                pending: member.data!.account.balances[1].vaultPendingWithdrawal.amount.toString(),
              },
              {
                token: 'MSRM',
                balance: member.data!.account.balances[1].vaultMega.amount.toString(),
                stake: member.data!.account.balances[1].vaultStakeMega.amount.toString(),
                spt: member.data!.account.balances[1].sptMega.amount.toString(),
                pending: member.data!.account.balances[1].vaultPendingWithdrawalMega.amount.toString(),
              },
            ],
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
        subheader={
          !member.isReady ? (
            <CircularProgress />
          ) : (
            member.data!.publicKey.toString()
          )
        }
      />
      <CardContent
        style={{
          position: 'relative',
          paddingTop: 0,
          paddingBottom: '16px',
        }}
      >
        {tables.map(t => (
          <BalanceTable
            key={t.title}
            title={t.title}
            description={t.description}
            rows={t.rows}
          />
        ))}
      </CardContent>
    </Card>
  );
}

type BalanceTableProps = {
  title: string;
  description: string;
  rows:
    | null
    | {
        token: string;
        balance: string;
        stake: string;
        pending: string;
        spt: string;
      }[];
};

function BalanceTable(props: BalanceTableProps) {
  const { title, rows, description } = props;
  return (
    <div style={{ marginBottom: '16px' }}>
      <Typography style={{ fontWeight: 'bold' }}>{title}</Typography>
      <Typography color="textSecondary" style={{ fontSize: '14px' }}>
        {description}
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Token</TableCell>
              <TableCell align="right">Available</TableCell>
              <TableCell align="right">Pending</TableCell>
              <TableCell align="right">Staked</TableCell>
              <TableCell align="right">Shares</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows === null ? (
              <CircularProgress />
            ) : (
              rows.map(row => (
                <TableRow key={row.token}>
                  <TableCell component="th" scope="row">
                    {row.token}
                  </TableCell>
                  <TableCell align="right">{row.balance}</TableCell>
                  <TableCell align="right">{row.pending}</TableCell>
                  <TableCell align="right">{row.stake}</TableCell>
                  <TableCell align="right">{row.spt}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
