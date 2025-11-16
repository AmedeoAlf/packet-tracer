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

export const l2send: Command<InternalState<object>> = {
  desc: 'Sends a raw layer 2 packet',
  autocomplete(state, _past) {
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
              // NOTE: (16/11/2025) Aspettando che il prossimo update di typescript riconosca l'esistenza di questo metodo
              (Uint8Array as any).fromBase64(past[3]);
              return true;
            } catch (e) {
              return false;
            }
          },
          autocomplete() { return []; },
          run(ctx) {
            const ifIdx = parseInterface(ctx.args!![1], ctx.state)!!;
            ctx.sendOnIf(
              ifIdx,
              new Layer2Packet(
                (Uint8Array as any).fromBase64(ctx.args!![3]), ctx.state.netInterfaces[ifIdx].mac
              ).toBytes()
            );
          },
        }
      }
    }
  }
}
