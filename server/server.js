// server/server.js
const express = require("express");
const { ethers } = require("ethers");
const app = express();
app.use(express.json());

app.post("/prove", (req, res) => {
  try {
    const { wallet } = req.body;
    const start = Math.floor(Date.now() / 1000) - 365 * 24 * 3600;
    const end = Math.floor(Date.now() / 1000);
    const threshold = 10;
    const count = 12; // mock: user qualifies
    const commitment = ethers.utils.hexZeroPad(ethers.utils.hexlify(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("demo-commit"))).slice(0,66), 32);

    const publicInputs = ethers.AbiCoder.prototype.encode(
      ["address","uint256","uint256","uint16","uint16","bytes32"],
      [wallet, start, end, threshold, count, commitment]
    );

    return res.json({
      publicInputs: publicInputs,
      proof: "0xdeadbeef",
      outputs: { count, commitment }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.MOCK_PROVER_PORT || 3001;
app.listen(PORT, () => console.log(`Mock prover listening on http://localhost:${PORT}/prove`));
