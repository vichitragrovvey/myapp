import { ClassicPreset as Classic, type GetSchemes, NodeEditor } from 'rete';
import { type Injector } from '@angular/core';
import { type Area2D, AreaExtensions, AreaPlugin } from 'rete-area-plugin';
import {
  ConnectionPlugin,
  Presets as ConnectionPresets,
} from 'rete-connection-plugin';

import {
  AngularPlugin,
  type AngularArea2D,
  Presets as AngularPresets,
} from 'rete-angular-plugin/18';

import { DataflowEngine, type DataflowNode } from 'rete-engine';
import {
  AutoArrangePlugin,
  Presets as ArrangePresets,
} from 'rete-auto-arrange-plugin';

import {
  ContextMenuPlugin,
  type ContextMenuExtra,
  Presets as ContextMenuPresets,
} from 'rete-context-menu-plugin';

type Node =
  | StartNode
  | NumberNode
  | AddNode
  | ConditionNode
  | LogNode
  | MergeNode
  | EndNode;
// type Conn =
//   | Connection<NumberNode, AddNode>
//   | Connection<AddNode, AddNode>
//   | Connection<AddNode, NumberNode>;
type Conn =
  | Connection<StartNode, NumberNode>
  | Connection<StartNode, AddNode>
  | Connection<StartNode, ConditionNode>
  | Connection<NumberNode, AddNode>
  | Connection<NumberNode, ConditionNode>
  | Connection<AddNode, AddNode>
  | Connection<AddNode, ConditionNode>
  | Connection<ConditionNode, AddNode>
  | Connection<ConditionNode, ConditionNode>
  | Connection<NumberNode, AddNode>
  | Connection<AddNode, ConditionNode>
  | Connection<ConditionNode, LogNode>
  | Connection<ConditionNode, AddNode>
  | Connection<ConditionNode, EndNode>
  | Connection<LogNode, EndNode>
  | Connection<ConditionNode, LogNode>
  | Connection<LogNode, MergeNode>
  | Connection<MergeNode, EndNode>
  | Connection<StartNode, ConditionNode>
  | Connection<NumberNode, AddNode>
  | Connection<AddNode, ConditionNode>;

type Schemes = GetSchemes<Node, Conn>;

const flowSocket = new Classic.Socket('flow');
const numberSocket = new Classic.Socket('number');

class Connection<A extends Node, B extends Node> extends Classic.Connection<
  A,
  B
> {}

class MergeNode extends Classic.Node implements DataflowNode {
  width = 160;
  height = 120;

  constructor() {
    super('Merge');

    // two FLOW inputs (fan-in)
    this.addInput('a', new Classic.Input(flowSocket, 'A'));
    this.addInput('b', new Classic.Input(flowSocket, 'B'));

    // single FLOW output
    this.addOutput('flow', new Classic.Output(flowSocket, 'Flow'));
  }

  data() {
    // if execution reaches here, continue
    return {
      flow: true,
    };
  }
}

class EndNode extends Classic.Node implements DataflowNode {
  width = 160;
  height = 80;

  constructor(label = 'End') {
    super(label);

    // FLOW input only
    this.addInput('flow', new Classic.Input(flowSocket, 'Flow'));
  }

  data() {
    //console.log(`🏁 Workflow ended at "${this.label}"`);
    return {};
  }
}

class StartNode extends Classic.Node implements DataflowNode {
  width = 160;
  height = 80;

  constructor() {
    super('Start');

    //this.addOutput('flow', new Classic.Output(socket, 'Flow'));
    this.addOutput('flow', new Classic.Output(flowSocket, 'Flow'));
  }

  data() {
    // initial execution signal
    return {
      flow: true,
    };
  }
}

class NumberNode extends Classic.Node implements DataflowNode {
  width = 180;
  height = 120;

  constructor(initial: number, change?: (value: number) => void) {
    super('Number');

    // this.addInput('flow', new Classic.Input(socket, 'Flow'));
    // this.addOutput('flow', new Classic.Output(socket, 'Flow'));
    // this.addOutput('value', new Classic.Output(socket, 'Number'));

    // this.addInput('flow', new Classic.Input(flowSocket, 'Flow'));
    // this.addOutput('flow', new Classic.Output(flowSocket, 'Flow'));

    this.addOutput('value', new Classic.Output(numberSocket, 'Number'));

    this.addControl(
      'value',
      new Classic.InputControl('number', { initial, change }),
    );
  }
  data() {
    const value = (this.controls['value'] as Classic.InputControl<'number'>)
      .value;

    return {
      value,
    };
  }
}

class AddNode extends Classic.Node implements DataflowNode {
  width = 180;
  height = 195;

  constructor() {
    super('Add');

    //this.addInput('flow', new Classic.Input(flowSocket, 'Flow'));

    this.addInput('a', new Classic.Input(numberSocket, 'A'));
    this.addInput('b', new Classic.Input(numberSocket, 'B'));

    //this.addOutput('flow', new Classic.Output(flowSocket, 'Flow'));
    this.addOutput('value', new Classic.Output(numberSocket, 'Number'));

    this.addControl(
      'result',
      new Classic.InputControl('number', { initial: 0, readonly: true }),
    );
  }
  data(inputs: { a?: number[]; b?: number[] }) {
    const { a = [], b = [] } = inputs;
    const sum = (a[0] || 0) + (b[0] || 0);

    (this.controls['result'] as Classic.InputControl<'number'>).setValue(sum);

    return {
      value: sum,
    };
  }
}

class ConditionNode extends Classic.Node implements DataflowNode {
  width = 220;
  height = 160;

  constructor() {
    super('Condition');

    // this.addInput('flow', new Classic.Input(socket, 'Flow'));
    // this.addInput('value', new Classic.Input(socket, 'Value'));

    // // FLOW output (to End)
    // this.addOutput('flow', new Classic.Output(socket, 'Flow'));

    // this.addOutput('true', new Classic.Output(socket, 'True'));
    // this.addOutput('false', new Classic.Output(socket, 'False'));
    this.addInput('flow', new Classic.Input(flowSocket, 'Flow'));
    this.addInput('value', new Classic.Input(numberSocket, 'Value'));

    this.addOutput('true', new Classic.Output(flowSocket, 'True'));
    this.addOutput('false', new Classic.Output(flowSocket, 'False'));

    this.addControl(
      'threshold',
      new Classic.InputControl('number', { initial: 0 }),
    );
  }

  data(inputs: { value?: number[] }) {
    const value = inputs.value?.[0] ?? 0;

    const thresholdControl = this.controls['threshold'] as
      | Classic.InputControl<'number'>
      | undefined;

    const threshold = thresholdControl?.value ?? 0;

    const result = value > threshold;
    // console.log(
    //   `Condition (${this.id}):`,
    //   value,
    //   '>',
    //   threshold,
    //   '=',
    //   result ? 'TRUE' : 'FALSE',
    // );
    // return {
    //   true: result ? value : undefined,
    //   false: !result ? value : undefined,
    // };
    return {
      true: result ? true : undefined,
      false: !result ? true : undefined,
    };
  }
}

class LogNode extends Classic.Node implements DataflowNode {
  width = 220;
  height = 100;

  constructor(label: string) {
    super('Log');

    // FLOW input
    this.addInput('flow', new Classic.Input(flowSocket, 'Flow'));

    // FLOW output (to End)
    this.addOutput('flow', new Classic.Output(flowSocket, 'Flow'));

    this.addInput('in', new Classic.Input(numberSocket, 'In'));

    this.addControl(
      'label',
      new Classic.InputControl('text', { initial: label }),
    );
  }

  data(inputs: { in?: number[] }) {
    const value = inputs.in?.[0];

    const label =
      (this.controls['label'] as Classic.InputControl<'text'>)?.value ?? 'Log';

    console.log(`✔ ${this.label} executed`);

    return {
      flow: true,
    };
  }
}

type AreaExtra = Area2D<Schemes> | AngularArea2D<Schemes> | ContextMenuExtra;

const socket = new Classic.Socket('socket');

export async function createEditor(container: HTMLElement, injector: Injector) {
  const editor = new NodeEditor<Schemes>();
  const area = new AreaPlugin<Schemes, AreaExtra>(container);
  const connection = new ConnectionPlugin<Schemes, AreaExtra>();

  const angularRender = new AngularPlugin<Schemes, AreaExtra>({ injector });

  const contextMenu = new ContextMenuPlugin<Schemes>({
    items: ContextMenuPresets.classic.setup([
      ['Number', () => new NumberNode(1, process)],
      ['Condition', () => new ConditionNode()],
      ['Add', () => new AddNode()],
      ['Log YES', () => new LogNode('YES branch')],
      ['Log NO', () => new LogNode('NO branch')],
      ['Start', () => new StartNode()],
      ['Merge', () => new MergeNode()],
      ['End', () => new EndNode('End')],
      ['End (Failure)', () => new EndNode('Failure')],
    ]),
  });

  editor.use(area);

  area.use(angularRender);

  area.use(connection);
  area.use(contextMenu);

  connection.addPreset(ConnectionPresets.classic.setup());

  angularRender.addPreset(AngularPresets.classic.setup());
  angularRender.addPreset(AngularPresets.contextMenu.setup());

  const dataflow = new DataflowEngine<Schemes>();

  editor.use(dataflow);

  const a = new NumberNode(1, process);
  const b = new NumberNode(1, process);
  const add = new AddNode();
  //const start = new StartNode();

  await editor.addNode(a);
  await editor.addNode(b);
  await editor.addNode(add);
  //await editor.addNode(start);

  await editor.addConnection(new Connection(a, 'value', add, 'a'));
  await editor.addConnection(new Connection(b, 'value', add, 'b'));

  const arrange = new AutoArrangePlugin<Schemes>();

  arrange.addPreset(ArrangePresets.classic.setup());

  area.use(arrange);

  await arrange.layout();

  AreaExtensions.zoomAt(area, editor.getNodes());

  AreaExtensions.simpleNodesOrder(area);

  const selector = AreaExtensions.selector();
  const accumulating = AreaExtensions.accumulateOnCtrl();

  AreaExtensions.selectableNodes(area, selector, { accumulating });

  async function process() {
    dataflow.reset();

    console.log('▶ Workflow execution started');


    const endNodes = editor.getNodes().filter((n) => n instanceof EndNode);

    for (const end of endNodes) {
      await dataflow.fetch(end.id);
    }

    console.log('✔ Workflow execution finished');
  }

  editor.addPipe((context) => {
    if (
      context.type === 'connectioncreated' ||
      context.type === 'connectionremoved'
    ) {
      process();
    }
    return context;
  });

  process();

  return {
    destroy: () => area.destroy(),
  };
}
