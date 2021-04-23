import React from 'react';
import Typography from '@material-ui/core/Typography';
import Link from '@material-ui/core/Link';

export default function Footer() {
  return (
    <div
      style={{
        zIndex: 99,
        position: 'fixed',
        width: '100%',
        bottom: 0,
        textAlign: 'center',
        height: '30px',
        backgroundColor: '#fbfbfb',
        borderTop: 'solid 1pt #ccc',
        display: 'flex',
        justifyContent: 'space-between',
        paddingLeft: '10px',
        paddingRight: '10px',
      }}
    >
      <div style={{ marginLeft: 'auto', marginRight: 'auto', display: 'flex' }}>
        <FooterButton
          href={
            'https://github.com/project-serum/anchor/blob/master/examples/lockup/docs/staking.md'
          }
          label={'Technical Documentation'}
        />
        <FooterButton
          href={'https://github.com/project-serum/awesome-serum'}
          label={'Developer Resources'}
        />
        <FooterButton
          href={'https://discord.com/channels/739225212658122886'}
          label={'Discord'}
        />
        <FooterButton href={'https://t.me/ProjectSerum'} label={'Telegram'} />
        <FooterButton
          href={'https://github.com/project-serum'}
          label={'GitHub'}
        />
        <FooterButton
          href={'https://solanabeach.io/'}
          label={'Solana Network'}
          isEnd={true}
        />
      </div>
    </div>
  );
}

type FooterButtonProps = {
  label: string;
  href: string;
  isEnd?: boolean;
};

function FooterButton(props: FooterButtonProps) {
  const { label, href, isEnd } = props;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column',
        marginRight: isEnd ? '' : '15px',
      }}
    >
      <Link href={href} target="_blank" color="inherit">
        <Typography style={{ fontSize: '14px' }}>{label}</Typography>
      </Link>
    </div>
  );
}
