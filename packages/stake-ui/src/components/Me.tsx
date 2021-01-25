import React from 'react';
import { useSelector } from 'react-redux';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import CircularProgress from '@material-ui/core/CircularProgress';
import { State as StoreState } from '../store/reducer';
import { toDisplay, toDisplayLabel } from '../utils/tokens';

export default function Me() {
  const { member } = useSelector((state: StoreState) => {
    return {
      member: state.registry.member,
    };
  });

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <div style={{ flex: 1, marginTop: '24px', marginBottom: '24px' }}>
        {member && <MemberBalancesCard />}
      </div>
    </div>
  );
}

// Assumes a member and all vaults is available in the store.
function MemberBalancesCard() {
  const {
    mint,
    registrar,
    vault,
    vaultStake,
    vaultPw,
    spt,
    lockedVault,
    lockedVaultStake,
    lockedVaultPw,
    lockedSpt,
  } = useSelector((state: StoreState) => {
    const member = state.accounts[state.registry.member!.toString()];
    const registrar = state.accounts[state.registry.registrar.toString()];
    return {
      registrar,
      mint: state.accounts[registrar.mint.toString()],
      vault: state.accounts[member.balances.vault],
      vaultStake: state.accounts[member.balances.vaultStake],
      vaultPw: state.accounts[member.balances.vaultPw],
      spt: state.accounts[member.balances.spt],
      lockedVault: state.accounts[member.balancesLocked.vault],
      lockedVaultStake: state.accounts[member.balancesLocked.vaultStake],
      lockedVaultPw: state.accounts[member.balancesLocked.vaultPw],
      lockedSpt: state.accounts[member.balancesLocked.spt],
    };
  });
  const tables = [
    {
      title: 'Main Balances',
      description: 'Balances deposited directly from the connected wallet.',
      rows: [
        {
          token: toDisplayLabel(registrar.mint),
          balance: toDisplay(vault.amount, mint.decimals),
          stake: toDisplay(vaultStake.amount, mint.decimals),
          pending: toDisplay(vaultPw.amount, mint.decimals),
          spt: toDisplay(spt.amount, 0),
        },
      ],
    },
    {
      title: 'Locked Balances',
      description:
        'Balances deposited from the lockup program. These funds are isolated from the Main Balances and may only be withdrawn back to the lockup program. At all times they are program controlled.',
      rows: [
        {
          token: toDisplayLabel(registrar.mint),
          balance: toDisplay(lockedVault.amount, mint.decimals),
          stake: toDisplay(lockedVaultStake.amount, mint.decimals),
          pending: toDisplay(lockedVaultPw.amount, mint.decimals),
          spt: toDisplay(lockedSpt.amount, 0),
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
      <CardContent
        style={{
          marginTop: '24px',
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
              <TableCell align="right">Pool</TableCell>
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
