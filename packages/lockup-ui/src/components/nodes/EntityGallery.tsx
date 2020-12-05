import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSnackbar } from 'notistack';
import { Img } from 'react-image';
import { PublicKey } from '@solana/web3.js';
import { accounts, metaEntity } from '@project-serum/registry';
import Card from '@material-ui/core/Card';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Brightness1Icon from '@material-ui/icons/Brightness1';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import TextField from '@material-ui/core/TextField';
import { useWallet } from '../../components/common/WalletProvider';
import { ProgramAccount, State as StoreState } from '../../store/reducer';
import { ActionType } from '../../store/actions';
import Entity from './Entity';
import * as skin from '../../skin';

export default function EntityGallery() {
  const [entityAddress, setEntityAddress] = useState<null | PublicKey>(null);
  let { entities, metadata, isWalletConnected } = useSelector(
    (state: StoreState) => {
      return {
        entities: state.registry.entities,
        metadata: state.registry.entityMetadata,
        isWalletConnected: state.common.isWalletConnected,
        member: state.registry.member,
      };
    },
  );
  // Sort entities by activation.
  entities = entities
    .filter(e => e.account.state.active !== undefined)
    .concat(
      entities.filter(e => e.account.state.pendingDeactivation !== undefined),
    )
    .concat(entities.filter(e => e.account.state.inactive !== undefined));

  let entity =
    entityAddress &&
    entities
      .filter(e => e.publicKey.toString() === entityAddress.toString())
      .pop();
  return (
    <>
      <EntityDialog
        open={entity !== null}
        onClose={() => setEntityAddress(null)}
        entity={entity}
      />
      <div style={{ flex: 1 }}>
        <div style={{ marginTop: '24px', marginBottom: '24px' }}>
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
              >
                <Typography
                  style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                  }}
                >
                  Nodes
                </Typography>
              </div>
              <NewButton
                style={{
                  visibility: !isWalletConnected /* || !member*/
                    ? 'hidden'
                    : '',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
              }}
            >
              {entities.map((entity, idx) => (
                <EntityCard
                  idx={idx}
                  metadata={metadata.get(entity.publicKey.toString())}
                  entity={entity}
                  onClick={() => setEntityAddress(entity.publicKey)}
                />
              ))}
            </div>
            <style>
              {`
.entity-card-container {
  transition: box-shadow .2s ease-out,-webkit-box-shadow .2s ease-out,-moz-box-shadow .2s ease-out;
}
.entity-card-container:hover {
  cursor: pointer;
  box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
  -moz-box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
  -webkit-box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
}
.entity-card-container-inner {
  transition: transform .2s ease-out,-webkit-transform .2s ease-out;
}
.entity-card-container-inner:hover {
  transform: scale(1.025);
  -webkit-transform: scalee(1.025);
}
					`}
            </style>
          </div>
        </div>
      </div>
    </>
  );
}

type EntityCardProps = {
  entity: ProgramAccount<accounts.Entity>;
  metadata?: ProgramAccount<metaEntity.accounts.metadata.Metadata>;
  onClick: () => void;
  idx: number; // TODO: Remove once we have a real default url.
};

function EntityCard(props: EntityCardProps) {
  const { entity, metadata, onClick, idx } = props;
  const imageUrl = metadata?.account.imageUrl;

  const height = idx + 361;

  // TODO: use a different default url.
  const defaultUrl = `https://source.unsplash.com/random/361x${height}`;
  return (
    <>
      <div
        style={{
          width: '304px',
          padding: '5px',
        }}
      >
        <div
          className="entity-card-container"
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Card
            onClick={onClick}
            style={{
              borderRadius: 10,
              height: '361px',
              boxShadow: '0px 0px 25px 0px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              className="entity-card-container-inner"
              style={{
                display: 'flex',
                height: '100%',
                justifyContent: 'space-between',
                flexDirection: 'column',
              }}
            >
              <div style={{ height: '144px', overflow: 'hidden' }}>
                <Img
                  style={{ width: '100%' }}
                  src={[`${imageUrl}`, defaultUrl]}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <Typography
                    style={{
                      fontWeight: 'bold',
                      fontSize: '16px',
                    }}
                  >
                    {metadata?.account.name}
                  </Typography>
                  <Typography
                    color="textSecondary"
                    style={{
                      fontSize: '12px',
                      overflow: 'hidden',
                    }}
                  >
                    {entity.publicKey.toString()}
                  </Typography>
                  <Typography
                    style={{
                      marginTop: '10px',
                      fontSize: '14px',
                    }}
                  >
                    {metadata?.account.about}
                  </Typography>
                </div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <EntityActivityLabel entity={entity} />
                  <Typography
                    style={{ fontSize: '14px' }}
                    color="textSecondary"
                  >
                    {`${entity.account.balances.sptAmount.toString()} | ${entity.account.balances.sptMegaAmount.toString()}`}
                  </Typography>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

type EntityActivityLabelProps = {
  entity: ProgramAccount<accounts.Entity>;
  noBubble?: boolean;
  textStyle?: any;
};

export function EntityActivityLabel(props: EntityActivityLabelProps) {
  const { entity, noBubble, textStyle } = props;
  return (
    <>
      {entity.account.state.active !== undefined && (
        <ActivityLabel
          noBubble={noBubble}
          color={skin.instance().active}
          text="Active"
          textStyle={textStyle || { fontSize: '14px' }}
        />
      )}
      {entity.account.state.pendingDeactivation !== undefined && (
        <ActivityLabel
          noBubble={noBubble}
          color={skin.instance().deactivating}
          text="Deactivating"
          textStyle={textStyle || { fontSize: '14px' }}
        />
      )}
      {entity.account.state.inactive !== undefined && (
        <ActivityLabel
          noBubble={noBubble}
          color={skin.instance().inactive}
          text="Inactive"
          textStyle={textStyle || { fontSize: '14px' }}
        />
      )}
    </>
  );
}

type ActivityLabelProps = {
  color: string;
  text: string;
  textStyle?: any;
  noBubble?: boolean;
};

function ActivityLabel(props: ActivityLabelProps) {
  const { color, text, noBubble, textStyle } = props;
  const tStyle = Object.assign(textStyle || {}, noBubble ? { color } : {});
  return (
    <div style={{ display: 'flex' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexDirection: 'column',
          marginRight: '10px',
        }}
      >
        <Brightness1Icon
          style={{
            display: noBubble ? 'none' : '',
            color,
            fontSize: '14px',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexDirection: 'column',
          fontSize: '10px',
        }}
      >
        <Typography color="textSecondary" style={tStyle}>
          {text}
        </Typography>
      </div>
    </div>
  );
}

type NewButtonProps = {
  style?: any;
};

function NewButton(props?: NewButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  return (
    <>
      <CreateEntityDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
      />
      <div style={props && props.style} onClick={() => setShowDialog(true)}>
        <Button variant="contained" color="secondary">
          New
        </Button>
      </div>
    </>
  );
}

type EntityDialogProps = {
  entity?: ProgramAccount<accounts.Entity> | null;
  open: boolean;
  onClose: () => void;
};

function EntityDialog(props: EntityDialogProps) {
  const { entity, open, onClose } = props;
  return (
    <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="md">
      <DialogContent
        style={{
          backgroundColor: '#fbfbfb',
          padding: 0,
        }}
      >
        {entity && <Entity entity={entity} />}
      </DialogContent>
    </Dialog>
  );
}

function CreateEntityDialog(props: EntityDialogProps) {
  const { open, onClose } = props;

  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const { registryClient } = useWallet();
  const dispatch = useDispatch();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const isCreateEnabled = name.length > 0;

  const createEntity = async () => {
    enqueueSnackbar('Creating entity...', {
      variant: 'info',
    });
    const { entity, metadata } = await registryClient.createEntity({
      name,
      about,
      imageUrl,
    });
    const entityAccount = await registryClient.accounts.entity(entity);
    dispatch({
      type: ActionType.RegistryCreateEntity,
      item: {
        entity: {
          publicKey: entity,
          account: entityAccount,
        },
      },
    });
    const newMetadata = await registryClient.accounts.metadata(metadata);
    dispatch({
      type: ActionType.RegistryCreateMetadata,
      item: {
        entityPublicKey: entity,
        metadata: {
          publicKey: metadata,
          account: newMetadata,
        },
      },
    });
    closeSnackbar();
    enqueueSnackbar(`Entity created ${entity}`, {
      variant: 'success',
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="md">
      <DialogTitle>Create Entity</DialogTitle>
      <DialogContent>
        <TextField
          label="Name"
          fullWidth
          variant="outlined"
          margin="normal"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <TextField
          label="About"
          fullWidth
          variant="outlined"
          margin="normal"
          value={about}
          onChange={e => setAbout(e.target.value)}
        />
        <TextField
          label="Image URL"
          fullWidth
          variant="outlined"
          margin="normal"
          value={imageUrl}
          onChange={e => setImageUrl(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() =>
            createEntity()
              .then(() => onClose())
              .catch(err => {
                enqueueSnackbar(`Error creating entity: ${err.toString()}`, {
                  variant: 'error',
                });
              })
          }
          type="submit"
          color="primary"
          disabled={!isCreateEnabled}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
