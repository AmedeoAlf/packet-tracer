import { ExampleDeviceInternalState } from "../../devices/list/ExampleDevice";
import { DeviceEmulator, runOnInterpreter } from "../DeviceEmulator";

export const exampleDeviceEmulator: DeviceEmulator<ExampleDeviceInternalState> =
  {
    // I vari menu mostrati `SelectTool`
    // NOTE: Il menu terminale è disegnato sempre
    configPanel: {
      menu1() {
        return <p> This is the menu No. 1 </p>;
      },
      "Menu 2"() {
        return <p> This is the menu No. 2 </p>;
      },
      "Menu 3"(ctx) {
        return (
          <p>
            {" "}
            Menus can show device state using the &quot;ctx&quot; param <br />{" "}
            {JSON.stringify(ctx.state, undefined, "  ")}{" "}
          </p>
        );
      },
      "Menu 4"(ctx) {
        return (
          <p>
            Menus can also mutate the device state: <br />
            exampleProp1:{" "}
            <input
              type="number"
              value={ctx.state.exampleProp1}
              onChange={(ev) => {
                ctx.state.exampleProp1 = +ev.target.value;
                ctx.updateState();
              }}
            />{" "}
            <br />
            exampleProp2:{" "}
            <input
              type="text"
              value={ctx.state.exampleProp2}
              onChange={(ev) => {
                ctx.state.exampleProp2 = ev.target.value;
                ctx.updateState();
              }}
            />{" "}
            <br />
          </p>
        );
      },
      "Menu 5"(ctx) {
        const cmd = "sum 0 1 2 3 4";
        // NOTE: `useState()`, as all React hooks, must not be called conditionally,
        // therefore it can't be used inside the panel. The solution is to store all
        // state inside the device's internalState
        return (
          <div>
            Panels can also run commands on the interpreter (in this case with
            output redirected inside &quot;exampleProp2&quot;): <br />
            <button
              onClick={() => {
                ctx.state.exampleProp2 = "";
                // Overwrite ctx.write() to change where will the cmd print to
                // NOTE: calling `ctx.updateState()` will discard any future
                // changes, it is better to call as a "flush()"
                ctx.write = (msg: string) => (ctx.state.exampleProp2 += msg);
                ctx.args = cmd.split(" ");
                runOnInterpreter(ctx);
                ctx.updateState();
              }}
            >
              Run: &quot;{cmd}&quot;
            </button>
            Contents of &quot;exampleProp2&quot;: {ctx.state.exampleProp2}
          </div>
        );
      },
    },
    packetHandler() {},
    cmdInterpreter: {
      shell: {
        // An entry *can* include a list of subcommands, these will support autocompletion automatically
        subcommands: {
          sum: {
            desc: "Sums all the other arguments passed",
            // An entry *can* also include a `run()` funtion that will actually be responsible for running the command
            run(ctx) {
              const result = ctx
                .args!.slice(1) // Take away arg0 (`sum`)
                .reduce((acc, val) => +val + acc, 0);
              ctx.write(result.toString());
            },
            done: true,
          },
          editprop: {
            desc: "Sets a prop of internalState to a json value",
            paramDesc: "prop",
            // Some commands need a special autocomplete
            autocomplete(state) {
              return Object.keys(state).map((it) => {
                return { desc: "property", option: it };
              });
            },
            // Those must specify a function which verifies that the argument is acceptable
            validate(state, args) {
              return args[1] in state;
            },
            // And must also define a command to then execute (which would just contain a run()
            // in case this command was the last one)
            then: {
              paramDesc: "New value",
              autocomplete() {
                return [];
              },
              validate() {
                return true;
              },
              then: {
                done: true,
                run(ctx) {
                  const prop = ctx.args![1];
                  const val = JSON.parse(ctx.args![2]);
                  (ctx.state as any)[prop] = val;
                  ctx.updateState();
                },
              },
            },
          },
        },
      },
    },
  };
