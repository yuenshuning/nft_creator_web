# nft creator web demo

A demo for [manifold](https://www.manifold.xyz/).

## How to run

1. Dependency

```
npm install
```

2. Set the private key for transaction signature

Create a new a file `key.js` in the project root directory

Add the smart contract account private key to your `key.js` file

```js
const privateKey = '06c...';

module.exports = {
    privateKey
}
```

Or use `.env` to set the private key.

3. Run

```js
node main.js
```
## 