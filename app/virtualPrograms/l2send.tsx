import { InternalState, SubCommand } from "../emulators/DeviceEmulator";
import { EthernetFrameSerializer, MAC_BROADCAST } from "../protocols/802_3";

function parseInterface<State extends InternalState<State>>(
  from: string,
  state: State,
): number | undefined {
  switch (true) {
    case !isNaN(+from): {
      const idx = parseInt(from);
      return idx < state.netInterfaces.length ? idx : undefined;
    }
    default: {
      const idx = state.netInterfaces.findIndex((it) => it.name == from);
      return idx != -1 ? idx : undefined;
    }
  }
}

export const l2send = <
  State extends InternalState<State>,
>(): SubCommand<State> => ({
  desc: "Sends a raw layer 2 packet",
  paramDesc: "Interface",
  autocomplete(state) {
    return state.netInterfaces.flatMap((intf, idx) => {
      const desc = `${intf.type} ${intf.maxMbps} Mbps`;
      return [
        { option: idx.toString(), desc: intf.name + " " + desc },
        { option: intf.name, desc },
      ];
    });
  },
  validate(state, past) {
    return parseInterface(past[1], state) != undefined;
  },
  then: {
    subcommands: {
      packet: {
        desc: "Sends an ethernet frame",
        paramDesc: "Payload in base64",
        validate(_, past) {
          try {
            Buffer.from(past[3], "base64");
            return true;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (_) {
            return false;
          }
        },
        autocomplete() {
          return [];
        },
        then: {
          run(ctx) {
            const ifIdx = parseInterface(ctx.args![1], ctx.state)!;
            ctx.sendOnIf(
              ifIdx,
              EthernetFrameSerializer.toBuffer({
                payload: Buffer.from(ctx.args![3], "base64"),
                src: ctx.state.netInterfaces[ifIdx].mac,
                dst: MAC_BROADCAST,
              }),
            );
          },
          done: true,
        },
      },
    },
  },
});
