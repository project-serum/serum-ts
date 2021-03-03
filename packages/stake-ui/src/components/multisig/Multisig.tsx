import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router';
import { useSnackbar } from 'notistack';
import { encode as encodeBase64 } from 'js-base64';
import Container from '@material-ui/core/Container';
import AppBar from '@material-ui/core/AppBar';
import GavelIcon from '@material-ui/icons/Gavel';
import Paper from '@material-ui/core/Paper';
import SupervisorAccountIcon from '@material-ui/icons/SupervisorAccount';
import CheckIcon from '@material-ui/icons/Check';
import ReceiptIcon from '@material-ui/icons/Receipt';
import RemoveIcon from '@material-ui/icons/Remove';
import Collapse from '@material-ui/core/Collapse';
import Toolbar from '@material-ui/core/Toolbar';
import InfoIcon from '@material-ui/icons/Info';
import Table from '@material-ui/core/Table';
import TableHead from '@material-ui/core/TableHead';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import BuildIcon from '@material-ui/icons/Build';
import Tooltip from '@material-ui/core/Tooltip';
import CircularProgress from '@material-ui/core/CircularProgress';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import CardContent from '@material-ui/core/CardContent';
import TextField from '@material-ui/core/TextField';
import IconButton from '@material-ui/core/IconButton';
import Button from '@material-ui/core/Button';
import SearchIcon from '@material-ui/icons/Search';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import AddIcon from '@material-ui/icons/Add';
import List from '@material-ui/core/List';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import BN from 'bn.js';
import {
  Account,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
} from '@solana/web3.js';
import { useWallet } from '../common/WalletProvider';
import { ViewTransactionOnExplorerButton } from '../common/Notification';

export default function Multisig({ multisig }: { multisig?: PublicKey }) {
  const history = useHistory();
  const [multisigAddress, setMultisigAddress] = useState('');
  const disabled = !isValidPubkey(multisigAddress);
  const searchFn = () => {
    history.push(`/multisig/${multisigAddress}`);
  };
  return (
    <div>
      <div
        style={{
          paddingLeft: '16px',
          paddingRight: '16px',
          borderBottom: 'solid 1pt #ccc',
          display: 'flex',
        }}
      >
        <input
          style={{
            flex: 1,
            background: 'none',
            padding: '16px',
            border: 'none',
            outlineWidth: 0,
          }}
          placeholder="Multisig address"
          value={multisigAddress}
          onChange={e => setMultisigAddress(e.target.value as string)}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              searchFn();
            }
          }}
        />
        <IconButton disabled={disabled} onClick={searchFn}>
          <SearchIcon />
        </IconButton>
        <NewMultisigButton />
      </div>
      <div>{multisig && <MultisigInstance multisig={multisig} />}</div>
    </div>
  );
}

function isValidPubkey(addr: string): boolean {
  try {
    new PublicKey(addr);
    return true;
  } catch (_) {
    return false;
  }
}

export function MultisigInstance({ multisig }: { multisig: PublicKey }) {
  const { multisigClient } = useWallet();
  const [multisigAccount, setMultisigAccount] = useState<any>(undefined);
  const [transactions, setTransactions] = useState<any>(null);
  const [showSignerDialog, setShowSignerDialog] = useState(false);
  const [showAddTransactionDialog, setShowAddTransactionDialog] = useState(
    false,
  );
  useEffect(() => {
    multisigClient.account
      .multisig(multisig)
      .then((account: any) => {
        setMultisigAccount(account);
      })
      .catch((err: any) => {
        console.error(err);
        setMultisigAccount(null);
      });
  }, [multisig, multisigClient.account]);
  useEffect(() => {
    multisigClient.account.transaction.all(multisig.toBuffer()).then(txs => {
      console.log('all txs', txs);
      setTransactions(txs);
    });
  }, [multisigClient.account.transaction, multisig]);
  return (
    <Container fixed maxWidth="md" style={{ marginBottom: '16px' }}>
      <div>
        <Card style={{ marginTop: '24px' }}>
          {multisigAccount === undefined ? (
            <div style={{ padding: '16px' }}>
              <CircularProgress
                style={{
                  display: 'block',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}
              />
            </div>
          ) : multisigAccount === null ? (
            <CardContent>
              <Typography
                color="textSecondary"
                style={{
                  padding: '24px',
                  textAlign: 'center',
                }}
              >
                Multisig not found
              </Typography>
            </CardContent>
          ) : (
            <></>
          )}
        </Card>
        {multisigAccount && (
          <Paper>
            <AppBar
              style={{ marginTop: '24px' }}
              position="static"
              color="default"
              elevation={1}
            >
              <Toolbar>
                <Typography variant="h6" style={{ flexGrow: 1 }} component="h2">
                  {multisig.toString()} | {multisigAccount.threshold.toString()}{' '}
                  of {multisigAccount.owners.length.toString()} Multisig
                </Typography>
                <Tooltip title="Signer" arrow>
                  <IconButton onClick={() => setShowSignerDialog(true)}>
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Add" arrow>
                  <IconButton onClick={() => setShowAddTransactionDialog(true)}>
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              </Toolbar>
            </AppBar>
            <List disablePadding>
              {transactions === null ? (
                <div style={{ padding: '16px' }}>
                  <CircularProgress
                    style={{
                      display: 'block',
                      marginLeft: 'auto',
                      marginRight: 'auto',
                    }}
                  />
                </div>
              ) : transactions.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No transactions found" />
                </ListItem>
              ) : (
                transactions.map((tx: any) => (
                  <TxListItem
                    multisig={multisig}
                    multisigAccount={multisigAccount}
                    tx={tx}
                  />
                ))
              )}
            </List>
          </Paper>
        )}
      </div>
      <AddTransactionDialog
        multisig={multisig}
        open={showAddTransactionDialog}
        onClose={() => setShowAddTransactionDialog(false)}
      />
      {multisigAccount && (
        <SignerDialog
          multisig={multisig}
          multisigAccount={multisigAccount}
          open={showSignerDialog}
          onClose={() => setShowSignerDialog(false)}
        />
      )}
    </Container>
  );
}

function NewMultisigButton() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <IconButton onClick={() => setOpen(true)}>
        <AddIcon />
      </IconButton>
      <NewMultisigDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function NewMultisigDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const history = useHistory();
  const { multisigClient } = useWallet();
  const { enqueueSnackbar } = useSnackbar();
  const [threshold, setThreshold] = useState(2);
  // @ts-ignore
  const zeroAddr = new PublicKey().toString();
  const [participants, setParticipants] = useState([
    multisigClient.provider.wallet.publicKey.toString(),
    zeroAddr,
  ]);
  const _onClose = () => {
    onClose();
    setThreshold(2);
    setParticipants([zeroAddr, zeroAddr]);
  };
  const createMultisig = async () => {
    enqueueSnackbar('Creating multisig', {
      variant: 'info',
    });
    const multisig = new Account();
    // Disc. + threshold + nonce.
    const baseSize = 8 + 8 + 1;
    // Can only grow the participant set by 2x the initialized value.
    const ownerSize = participants.length * 2 * 32 + 8;
    const multisigSize = baseSize + ownerSize;
    const [, nonce] = await PublicKey.findProgramAddress(
      [multisig.publicKey.toBuffer()],
      multisigClient.programId,
    );
    const owners = participants.map(p => new PublicKey(p));
    console.log('owners', owners, nonce);
    const tx = await multisigClient.rpc.createMultisig(
      owners,
      new BN(threshold),
      nonce,
      {
        accounts: {
          multisig: multisig.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
        },
        signers: [multisig],
        instructions: [
          await multisigClient.account.multisig.createInstruction(
            multisig,
            // @ts-ignore
            multisigSize,
          ),
        ],
      },
    );
    enqueueSnackbar(`Multisig created: ${multisig.publicKey.toString()}`, {
      variant: 'success',
      action: <ViewTransactionOnExplorerButton signature={tx} />,
    });
    _onClose();
    history.push(`/multisig/${multisig.publicKey.toString()}`);
  };
  return (
    <Dialog fullWidth open={open} onClose={_onClose} maxWidth="md">
      <DialogTitle>
        <Typography variant="h4" component="h2">
          New Multisig
        </Typography>
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Threshold"
          value={threshold}
          type="number"
          onChange={e => setThreshold(parseInt(e.target.value) as number)}
        />
        {participants.map((p, idx) => (
          <TextField
            key={p}
            fullWidth
            label="Participant"
            value={p}
            onChange={e => {
              const p = [...participants];
              p[idx] = e.target.value;
              setParticipants(p);
            }}
          />
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton
            onClick={() => {
              const p = [...participants];
              // @ts-ignore
              p.push(new PublicKey().toString());
              setParticipants(p);
            }}
          >
            <AddIcon />
          </IconButton>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={_onClose}>Cancel</Button>
        <Button
          variant="contained"
          type="submit"
          color="primary"
          onClick={() =>
            createMultisig().catch(err => {
              const str = err ? err.toString() : '';
              enqueueSnackbar(`Error creating multisig: ${str}`, {
                variant: 'error',
              });
            })
          }
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function TxListItem({
  multisig,
  multisigAccount,
  tx,
}: {
  multisig: PublicKey;
  multisigAccount: any;
  tx: any;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const { multisigClient } = useWallet();
  const [open, setOpen] = useState(false);
  const rows = [
    {
      field: 'Program ID',
      value: tx.account.programId.toString(),
    },
    {
      field: 'Did execute',
      value: tx.account.didExecute.toString(),
    },
    {
      field: 'Instruction data',
      value: (
        <code
          style={{
            wordBreak: 'break-word',
            width: '370px',
            background: 'black',
            color: '#ffffff',
            float: 'right',
            textAlign: 'left',
          }}
        >
          {encodeBase64(tx.account.data)}
        </code>
      ),
    },
    {
      field: 'Multisig',
      value: tx.account.multisig.toString(),
    },
    {
      field: 'Transaction account',
      value: tx.publicKey.toString(),
    },
  ];
  const msAccountRows = multisigAccount.owners.map(
    (owner: PublicKey, idx: number) => {
      return {
        field: owner.toString(),
        value: tx.account.signers[idx] ? <CheckIcon /> : <RemoveIcon />,
      };
    },
  );
  const approve = async () => {
    enqueueSnackbar('Approving transaction', {
      variant: 'info',
    });
    await multisigClient.rpc.approve({
      accounts: {
        multisig,
        transaction: tx.publicKey,
        owner: multisigClient.provider.wallet.publicKey,
      },
    });
    enqueueSnackbar('Transaction approved', {
      variant: 'success',
    });
  };
  const execute = async () => {
    enqueueSnackbar('Executing transaction', {
      variant: 'info',
    });
    const [multisigSigner] = await PublicKey.findProgramAddress(
      [multisig.toBuffer()],
      multisigClient.programId,
    );
    console.log(
      'executing',
      multisig.toString(),
      multisigSigner.toString(),
      tx.publicKey.toString(),
    );
    await multisigClient.rpc.executeTransaction({
      accounts: {
        multisig,
        multisigSigner,
        transaction: tx.publicKey,
      },
      remainingAccounts: tx.account.accounts
        .map((t: any) => {
          if (t.pubkey.equals(multisigSigner)) {
            return { ...t, isSigner: false };
          }
          return t;
        })
        .concat({
          pubkey: tx.account.programId,
          isWritable: false,
          isSigner: false,
        }),
    });
    enqueueSnackbar('Transaction executed', {
      variant: 'success',
    });
  };
  return (
    <>
      <ListItem button onClick={() => setOpen(!open)}>
        <ListItemIcon>{icon(tx, multisigClient)}</ListItemIcon>
        {ixLabel(tx, multisigClient)}
        {tx.account.didExecute && (
          <CheckCircleIcon style={{ marginRight: '16px' }} />
        )}
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <div style={{ background: '#ececec', padding: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              style={{ marginRight: '10px' }}
              variant="contained"
              color="primary"
              onClick={() =>
                approve().catch(err => {
                  let errStr = '';
                  if (err) {
                    errStr = err.toString();
                  }
                  enqueueSnackbar(`Unable to approve transaction: ${errStr}`, {
                    variant: 'error',
                  });
                })
              }
            >
              Approve
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={() =>
                execute().catch(err => {
                  let errStr = '';
                  if (err) {
                    errStr = err.toString();
                  }
                  enqueueSnackbar(`Unable to execute transaction: ${errStr}`, {
                    variant: 'error',
                  });
                })
              }
            >
              Execute
            </Button>
          </div>
          <Card style={{ marginTop: '16px' }}>
            <CardContent>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Transaction Field</TableCell>
                    <TableCell align="right">Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(r => (
                    <TableRow>
                      <TableCell>{r.field}</TableCell>
                      <TableCell align="right">{r.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card style={{ marginTop: '16px' }}>
            <CardContent>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Multisig Owner</TableCell>
                    <TableCell align="right">Did Sign</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {msAccountRows.map((r: any) => (
                    <TableRow>
                      <TableCell>{r.field}</TableCell>
                      <TableCell align="right">{r.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card style={{ marginTop: '16px' }}>
            <CardContent>
              <AccountsList accounts={tx.account.accounts} />
            </CardContent>
          </Card>
        </div>
      </Collapse>
    </>
  );
}

function ixLabel(tx: any, multisigClient: any) {
  if (tx.account.programId.equals(BPF_LOADER_UPGRADEABLE_PID)) {
    // Upgrade instruction.
    if (tx.account.data.equals(Buffer.from([3, 0, 0, 0]))) {
      return (
        <ListItemText
          primary="Program upgrade"
          secondary={tx.publicKey.toString()}
        />
      );
    }
  }
  if (tx.account.programId.equals(multisigClient.programId)) {
    const setThresholdSighash = multisigClient.coder.sighash(
      'global',
      'change_threshold',
    );
    if (setThresholdSighash.equals(tx.account.data.slice(0, 8))) {
      return (
        <ListItemText
          primary="Set threshold"
          secondary={tx.publicKey.toString()}
        />
      );
    }
    const setOwnersSighash = multisigClient.coder.sighash(
      'global',
      'set_owners',
    );
    if (setOwnersSighash.equals(tx.account.data.slice(0, 8))) {
      return (
        <ListItemText
          primary="Set owners"
          secondary={tx.publicKey.toString()}
        />
      );
    }
  }
  return <ListItemText primary={tx.publicKey.toString()} />;
}

function AccountsList({ accounts }: { accounts: any }) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Account</TableCell>
          <TableCell align="right">Writable</TableCell>
          <TableCell align="right">Signer</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {accounts.map((r: any) => (
          <TableRow>
            <TableCell>{r.pubkey.toString()}</TableCell>
            <TableCell align="right">{r.isWritable.toString()}</TableCell>
            <TableCell align="right">{r.isSigner.toString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SignerDialog({
  multisig,
  multisigAccount,
  open,
  onClose,
}: {
  multisig: PublicKey;
  multisigAccount: any;
  open: boolean;
  onClose: () => void;
}) {
  const { multisigClient } = useWallet();
  const [signer, setSigner] = useState<null | string>(null);
  useEffect(() => {
    PublicKey.findProgramAddress(
      [multisig.toBuffer()],
      multisigClient.programId,
    ).then(addrNonce => setSigner(addrNonce[0].toString()));
  }, [multisig, multisigClient.programId, setSigner]);
  return (
    <Dialog open={open} fullWidth onClose={onClose} maxWidth="md">
      <DialogTitle>
        <Typography variant="h4" component="h2">
          Multisig Info
        </Typography>
      </DialogTitle>
      <DialogContent style={{ paddingBottom: '16px' }}>
        <DialogContentText>
          <b>Program derived address</b>: {signer}. This is the address one
          should use as the authority for data governed by the multisig.
        </DialogContentText>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Owners</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {multisigAccount.owners.map((r: any) => (
              <TableRow>
                <TableCell>{r.toString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function AddTransactionDialog({
  multisig,
  open,
  onClose,
}: {
  multisig: PublicKey;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} fullWidth onClose={onClose} maxWidth="md">
      <DialogTitle>
        <Typography variant="h4" component="h2">
          New Transaction
        </Typography>
      </DialogTitle>
      <DialogContent style={{ paddingBottom: '16px' }}>
        <DialogContentText>
          Create a new transaction to be signed by the multisig. This
          transaction will not execute until enough owners have signed the
          transaction.
        </DialogContentText>
        <List disablePadding>
          <ProgramUpdateListItem multisig={multisig} onClose={onClose} />
          <MultisigSetOwnersListItem multisig={multisig} onClose={onClose} />
          <ChangeThresholdListItem multisig={multisig} onClose={onClose} />
        </List>
      </DialogContent>
    </Dialog>
  );
}

function ChangeThresholdListItem({
  multisig,
  onClose,
}: {
  multisig: PublicKey;
  onClose: Function;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ListItem button onClick={() => setOpen(open => !open)}>
        <ListItemIcon>
          <GavelIcon />
        </ListItemIcon>
        <ListItemText primary={'Change threshold'} />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <ChangeThresholdListItemDetails multisig={multisig} onClose={onClose} />
      </Collapse>
    </>
  );
}

function ChangeThresholdListItemDetails({
  multisig,
  onClose,
}: {
  multisig: PublicKey;
  onClose: Function;
}) {
  const [threshold, setThreshold] = useState(2);
  const { multisigClient } = useWallet();
  // @ts-ignore
  const { enqueueSnackbar } = useSnackbar();
  const changeThreshold = async () => {
    enqueueSnackbar('Creating change threshold transaction', {
      variant: 'info',
    });
    const data = changeThresholdData(multisigClient, threshold);
    const [multisigSigner] = await PublicKey.findProgramAddress(
      [multisig.toBuffer()],
      multisigClient.programId,
    );
    const accounts = [
      {
        pubkey: multisig,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: multisigSigner,
        isWritable: false,
        isSigner: true,
      },
    ];
    const transaction = new Account();
    const txSize = 1000; // todo
    const tx = await multisigClient.rpc.createTransaction(
      multisigClient.programId,
      accounts,
      data,
      {
        accounts: {
          multisig,
          transaction: transaction.publicKey,
          proposer: multisigClient.provider.wallet.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
        },
        signers: [transaction],
        instructions: [
          await multisigClient.account.transaction.createInstruction(
            transaction,
            // @ts-ignore
            txSize,
          ),
        ],
      },
    );
    enqueueSnackbar('Transaction created', {
      variant: 'success',
      action: <ViewTransactionOnExplorerButton signature={tx} />,
    });
    onClose();
  };
  return (
    <div
      style={{
        background: '#f1f0f0',
        paddingLeft: '24px',
        paddingRight: '24px',
      }}
    >
      <TextField
        fullWidth
        style={{ marginTop: '16px' }}
        label="Threshold"
        value={threshold}
        type="number"
        onChange={e => {
          // @ts-ignore
          setThreshold(e.target.value);
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={() => changeThreshold()}>Change Threshold</Button>
      </div>
    </div>
  );
}

function MultisigSetOwnersListItem({
  multisig,
  onClose,
}: {
  multisig: PublicKey;
  onClose: Function;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ListItem button onClick={() => setOpen(open => !open)}>
        <ListItemIcon>
          <SupervisorAccountIcon />
        </ListItemIcon>
        <ListItemText primary={'Set owners'} />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <SetOwnersListItemDetails multisig={multisig} onClose={onClose} />
      </Collapse>
    </>
  );
}

function SetOwnersListItemDetails({
  multisig,
  onClose,
}: {
  multisig: PublicKey;
  onClose: Function;
}) {
  const { multisigClient } = useWallet();
  // @ts-ignore
  const zeroAddr = new PublicKey().toString();
  const [participants, setParticipants] = useState([
    multisigClient.provider.wallet.publicKey.toString(),
    zeroAddr,
  ]);
  const { enqueueSnackbar } = useSnackbar();
  const setOwners = async () => {
    enqueueSnackbar('Creating setOwners transaction', {
      variant: 'info',
    });
    const owners = participants.map(p => new PublicKey(p));
    const data = setOwnersData(multisigClient, owners);
    const [multisigSigner] = await PublicKey.findProgramAddress(
      [multisig.toBuffer()],
      multisigClient.programId,
    );
    const accounts = [
      {
        pubkey: multisig,
        isWritable: true,
        isSigner: false,
      },
      {
        pubkey: multisigSigner,
        isWritable: false,
        isSigner: true,
      },
    ];
    const transaction = new Account();
    const txSize = 5000; // TODO: tighter bound.
    const tx = await multisigClient.rpc.createTransaction(
      multisigClient.programId,
      accounts,
      data,
      {
        accounts: {
          multisig,
          transaction: transaction.publicKey,
          proposer: multisigClient.provider.wallet.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
        },
        signers: [transaction],
        instructions: [
          await multisigClient.account.transaction.createInstruction(
            transaction,
            // @ts-ignore
            txSize,
          ),
        ],
      },
    );
    enqueueSnackbar('Transaction created', {
      variant: 'success',
      action: <ViewTransactionOnExplorerButton signature={tx} />,
    });
    onClose();
  };
  return (
    <div
      style={{
        background: '#f1f0f0',
        paddingLeft: '24px',
        paddingRight: '24px',
      }}
    >
      {participants.map((p, idx) => (
        <TextField
          fullWidth
          style={{ marginTop: '16px' }}
          label="Participant"
          value={p}
          onChange={e => {
            const p = [...participants];
            p[idx] = e.target.value;
            setParticipants(p);
          }}
        />
      ))}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <IconButton
          onClick={() => {
            const p = [...participants];
            // @ts-ignore
            p.push(new PublicKey().toString());
            setParticipants(p);
          }}
        >
          <AddIcon />
        </IconButton>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '16px',
          paddingBottom: '16px',
        }}
      >
        <Button onClick={() => setOwners()}>Set Owners</Button>
      </div>
    </div>
  );
}

function ProgramUpdateListItem({
  multisig,
  onClose,
}: {
  multisig: PublicKey;
  onClose: Function;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ListItem button onClick={() => setOpen(open => !open)}>
        <ListItemIcon>
          <BuildIcon />
        </ListItemIcon>
        <ListItemText primary={'Upgrade program'} />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <UpgradeProgramListItemDetails multisig={multisig} onClose={onClose} />
      </Collapse>
    </>
  );
}

const BPF_LOADER_UPGRADEABLE_PID = new PublicKey(
  'BPFLoaderUpgradeab1e11111111111111111111111',
);

function UpgradeProgramListItemDetails({
  multisig,
  onClose,
}: {
  multisig: PublicKey;
  onClose: Function;
}) {
  const [programId, setProgramId] = useState<null | string>(null);
  const [buffer, setBuffer] = useState<null | string>(null);

  const { multisigClient } = useWallet();
  const { enqueueSnackbar } = useSnackbar();
  const createTransactionAccount = async () => {
    enqueueSnackbar('Creating transaction', {
      variant: 'info',
    });
    const programAddr = new PublicKey(programId as string);
    const bufferAddr = new PublicKey(buffer as string);
    // Hard code serialization.
    const data = Buffer.from([3, 0, 0, 0]);

    const programAccount = await (async () => {
      const programAccount = await multisigClient.provider.connection.getAccountInfo(
        programAddr,
      );
      if (programAccount === null) {
        throw new Error('Invalid program ID');
      }
      return {
        // Hard code deserialization.
        programdataAddress: new PublicKey(programAccount.data.slice(4)),
      };
    })();
    const spill = multisigClient.provider.wallet.publicKey;
    const [multisigSigner] = await PublicKey.findProgramAddress(
      [multisig.toBuffer()],
      multisigClient.programId,
    );
    const accs = [
      {
        pubkey: programAccount.programdataAddress,
        isWritable: true,
        isSigner: false,
      },
      { pubkey: programAddr, isWritable: true, isSigner: false },
      { pubkey: bufferAddr, isWritable: true, isSigner: false },
      { pubkey: spill, isWritable: true, isSigner: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
      { pubkey: multisigSigner, isWritable: false, isSigner: false },
    ];
    const txSize = 1000; // TODO: tighter bound.
    const transaction = new Account();
    const tx = await multisigClient.rpc.createTransaction(
      BPF_LOADER_UPGRADEABLE_PID,
      accs,
      data,
      {
        accounts: {
          multisig,
          transaction: transaction.publicKey,
          proposer: multisigClient.provider.wallet.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
        },
        signers: [transaction],
        instructions: [
          await multisigClient.account.transaction.createInstruction(
            transaction,
            // @ts-ignore
            txSize,
          ),
        ],
      },
    );
    enqueueSnackbar('Transaction created', {
      variant: 'success',
      action: <ViewTransactionOnExplorerButton signature={tx} />,
    });
    onClose();
  };

  return (
    <div
      style={{
        background: '#f1f0f0',
        paddingLeft: '24px',
        paddingRight: '24px',
      }}
    >
      <TextField
        fullWidth
        style={{ marginTop: '16px' }}
        label="Program ID"
        value={programId}
        onChange={e => setProgramId(e.target.value as string)}
      />
      <TextField
        style={{ marginTop: '16px' }}
        fullWidth
        label="New program buffer"
        value={buffer}
        onChange={e => setBuffer(e.target.value as string)}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '16px',
          paddingBottom: '16px',
        }}
      >
        <Button onClick={() => createTransactionAccount()}>
          Create upgrade
        </Button>
      </div>
    </div>
  );
}

// @ts-ignore
function icon(tx, multisigClient) {
  if (tx.account.programId.equals(BPF_LOADER_UPGRADEABLE_PID)) {
    return <BuildIcon />;
  }
  if (tx.account.programId.equals(multisigClient.programId)) {
    const setThresholdSighash = multisigClient.coder.sighash(
      'global',
      'change_threshold',
    );
    if (setThresholdSighash.equals(tx.account.data.slice(0, 8))) {
      return <GavelIcon />;
    }
    const setOwnersSighash = multisigClient.coder.sighash(
      'global',
      'set_owners',
    );
    if (setOwnersSighash.equals(tx.account.data.slice(0, 8))) {
      return <SupervisorAccountIcon />;
    }
  }
  return <ReceiptIcon />;
}

// @ts-ignore
function changeThresholdData(multisigClient, threshold) {
  return multisigClient.coder.instruction.encode('change_threshold', {
    threshold: new BN(threshold),
  });
}

// @ts-ignore
function setOwnersData(multisigClient, owners) {
  return multisigClient.coder.instruction.encode('set_owners', {
    owners,
  });
}
