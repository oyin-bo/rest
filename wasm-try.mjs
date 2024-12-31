import { Wasmer, init } from "@wasmer/sdk";

(async () => {

  await init();
  let python = await Wasmer.fromRegistry("python/python");
  let instance = await python.entrypoint.run({
    args: ['-c', 'print(1+1)']
  });
  let output = await instance.wait();
  console.log(output);

})();