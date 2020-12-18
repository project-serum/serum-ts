import React, { useRef, useEffect, useState } from 'react';
import BN from 'bn.js';
import { useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import CircularProgress from '@material-ui/core/CircularProgress';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import * as registry from '@project-serum/registry';
import { State as StoreState } from '../../store/reducer';
import { useWallet } from './WalletProvider';
import Scroll from './Scroll';

export default function Messages() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { registryClient } = useWallet();
  const [messages, setMessages] = useState<null | Array<
    registry.metaEntity.accounts.mqueue.Message
  >>(null);
  const [message, setMessage] = useState('');
  let { metadata, member } = useSelector((state: StoreState) => {
    const member = state.registry.member!;
    const entity = state.registry.entities.filter(
      e =>
        e.publicKey.toString() ===
        member.data!.account.member.entity.toString(),
    )[0];
    return {
      metadata: state.registry.entityMetadata.get(entity.publicKey.toString()),
      member,
    };
  });
  const divRef = useRef(null);
  useEffect(() => {
    async function fetchMessages() {
      if (metadata) {
        const mqueue = registryClient.accounts.mqueueConnect(
          metadata!.account.chat,
        );
        mqueue.on('connected', messages => {
          setMessages(messages);
        });
        mqueue.on('message', message => {
          // todo
        });
        mqueue.on('mqueue', mqueue => {
          setMessages(mqueue.messages());
          if (divRef) {
            // @ts-ignore
            divRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        });
      }
    }
    fetchMessages();
  }, [registryClient.accounts, metadata]);

  const sendMessage = async () => {
    enqueueSnackbar('Sending message...', {
      variant: 'info',
    });
    await registryClient.sendMessage({
      from: member.data!.publicKey,
      ts: new BN(Date.now()),
      content: message,
      mqueue: metadata!.account.chat,
    });
    closeSnackbar();
  };
  const handleKeyPress = async (e: any) => {
    if (e.key === 'Enter') {
      try {
        await sendMessage();
        setMessage('');
      } catch (err) {
        enqueueSnackbar(`Error sending message: ${err.toString()}`, {
          variant: 'error',
        });
      }
    }
  };
  return (
    <div style={{ background: 'white', height: '100%' }}>
      {messages == null ? (
        <CircularProgress />
      ) : (
        <div
          style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
          <div
            style={{
              textAlign: 'left',
              borderBottom: 'solid 1pt #ccc',
              padding: '10px',
            }}
          >
            <Typography style={{ fontWeight: 'bold', fontSize: '14px' }}>
              {metadata!.account.name} Chat
            </Typography>
          </div>
          <Scroll>
            <div style={{ flex: 1 }}>
              <ul style={{ paddingLeft: '10px' }}>
                {messages.map(m => {
                  return (
                    <li
                      style={{
                        display: 'flex',
                      }}
                    >
                      <Typography
                        style={{
                          fontSize: '14px',
                          width: '75px',
                          overflow: 'hidden',
                        }}
                        color="textSecondary"
                      >
                        {m.from.toString()}
                      </Typography>
                      <Typography
                        style={{
                          textAlign: 'left',
                          marginLeft: '10px',
                          fontSize: '14px',
                        }}
                      >
                        {m.content}
                      </Typography>
                    </li>
                  );
                })}
                <div ref={divRef} />
              </ul>
            </div>
          </Scroll>
          <div style={{ marginTop: '10px', display: 'flex' }}>
            <TextField
              onKeyPress={handleKeyPress}
              size="small"
              variant="outlined"
              value={message}
              onChange={e => setMessage(e.target.value as string)}
              style={{
                width: '100%',
                marginBottom: '10px',
                marginLeft: '10px',
                marginRight: '10px',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
