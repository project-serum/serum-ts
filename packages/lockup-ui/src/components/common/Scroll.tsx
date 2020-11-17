import React from 'react';

export default function Scroll(props: any) {
  return (
    <div
      style={{
        position: 'relative',
        overflowY: 'scroll',
        flex: 1,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          maxHeight: '100%',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {props.children}
      </div>
    </div>
  );
}
