import { Command, InternalState } from "../emulators/DeviceEmulator";
import { Layer2Packet } from "../protocols/802_3";

function parseInterface(from: string, state: InternalState<object>): number | undefined {
  switch (true) {
    case !isNaN(+from): {
      const idx = parseInt(from);
      return (idx < state.netInterfaces.length) ? idx : undefined;
    }
    default: {
      const idx = state.netInterfaces.findIndex(it => it.name == from);
      return idx != -1 ? idx : undefined;
    }
  }
}

export function l2send<T extends InternalState<object>>() {
  return {
    desc: 'Sends a raw layer 2 packet',
    autocomplete(state) {
      return state.netInterfaces.flatMap((intf, idx) => {
        const desc = `${intf.type} ${intf.maxMbps} Mbps`;
        return [{ option: idx.toString(), desc: intf.name + " " + desc }, { option: intf.name, desc }]
      })
    },
    validate(state, past) {
      return parseInterface(past[1], state) != undefined
    },
    then: {
      desc: 'The device interface',
      subcommands: {
        packet: {
          desc: "Sends an ethernet frame",
          validate() { return true; },
          autocomplete() { return []; },
          then: {
            desc: "Payload in base64",
            validate(_, past) {
              try {
                Buffer.from(past[3], "base64");
                return true;
              } catch (_) {
                return false;
              }
            },
            autocomplete() { return []; },
            run(ctx) {
              const ifIdx = parseInterface(ctx.args![1], ctx.state)!;
              ctx.sendOnIf(
                ifIdx,
                new Layer2Packet(
                  Buffer.from(ctx.args![3], "base64"), ctx.state.netInterfaces[ifIdx].mac
                ).toBytes()
              );
            },
          }
        }
      }
    }
  } satisfies Command<T>;
}
