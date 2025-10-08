const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/prove', (req, res) => {
  const { wallet } = req.body || {};
  console.log("Fake proof request from:", wallet);

  const outputs = { count: 12, commitment: '0x' + '11'.repeat(32) };
  const publicInputs = ethers.utils.defaultAbiCoder.encode(
    ['address','uint256','uint256','uint16','uint16','bytes32'],
    [wallet || '0x000000000000000000000000000000000000dead',
     Math.floor(Date.now()/1000)-365*24*3600,
     Math.floor(Date.now()/1000),
     10,
     outputs.count,
     outputs.commitment]
  );

  res.json({
    success: true,
    message: 'Mock proof generated successfully!',
    publicInputs,
    proof: '0xdeadbeef',
    outputs,
  });
});

app.listen(3001, () => console.log('🧪 Mock Brevis API running at http://localhost:3001/prove'));
