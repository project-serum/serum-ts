import React from 'react';
import { useHistory, useLocation } from 'react-router';
import Multisig from '../components/multisig/Multisig';
import { PublicKey } from '@solana/web3.js';

export default function MultisigPage() {
  return <Multisig />;
}

export function MultisigInstancePage() {
  const history = useHistory();
  const location = useLocation();
  const path = location.pathname.split('/');
  if (path.length !== 3) {
    history.push(`/multisig`);
    return <></>;
  } else {
    const multisig = new PublicKey(path[2]);
    return <Multisig multisig={multisig} />;
  }
}
