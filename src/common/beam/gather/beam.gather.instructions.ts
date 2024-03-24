import { bareBonesPromptMixer } from '~/modules/persona/pmix/pmix';

import type { DLLMId } from '~/modules/llms/store-llms';

import { createDMessage, type DMessage } from '~/common/state/store-chats';

import { BFusion, FusionUpdateOrFn } from './beam.gather';
import { GATHER_PLACEHOLDER } from '../beam.config';
import { streamAssistantMessage } from '../../../apps/chat/editors/chat-stream';
import { VChatMessageIn } from '~/modules/llms/llm.client';


// Temp: Move
export function mixInstructionPrompt(prompt: string, raysReady: number): string {
  return bareBonesPromptMixer(prompt, undefined, {
    '{{N}}': raysReady.toString(),
  });
}


/// [Asynchronous Instruction Framework] ///

interface BaseInstruction {
  type: string;
  label: string;
}

export interface ChatGenerateInstruction extends BaseInstruction {
  type: 'chat-generate';
  // s-s0-h0-u0-aN-u: sandwiches the existing history and the new proposals in between the System and User prompts of the Instruction
  method: 's-s0-h0-u0-aN-u';
  systemPrompt: string;
  userPrompt: string;
  // evalPrompt?: string;
  outputType: 'display-message' | 'user-checklist';
}

interface UserInputChecklistInstruction extends BaseInstruction {
  type: 'user-input-checklist';
}

export type Instruction = ChatGenerateInstruction | UserInputChecklistInstruction;


export async function executeChatGenerateInstruction(
  { label, systemPrompt, userPrompt, method }: ChatGenerateInstruction,
  { llmId, chatMessages, rayMessages, chainAbortController, onUpdate }: StateImmutable,
): Promise<void> {

  // build the input messages
  if (method !== 's-s0-h0-u0-aN-u')
    throw new Error(`Unsupported Chat Generate method: ${method}`);

  const _promptVars = (prompt: string) => mixInstructionPrompt(prompt, rayMessages.length);

  const history: VChatMessageIn[] = [
    // s
    { role: 'system', content: _promptVars(systemPrompt) },
    // s0-h0-u0
    ...chatMessages
      .filter((m) => (m.role === 'user' || m.role === 'assistant'))
      .map((m): VChatMessageIn => ({ role: (m.role !== 'assistant') ? 'user' : m.role, content: m.text })),
    // aN
    ...rayMessages.map((m): VChatMessageIn => ({ role: 'assistant', content: m.text })),
    // u
    { role: 'user', content: _promptVars(userPrompt) },
  ];

  const updateMessage = (update: Partial<DMessage>) => onUpdate((fusion) => ({
    // ...fusion,
    outputMessage: {
      ...fusion.outputMessage!,
      ...update,
      // only update the timestamp when the text changes
      ...(update.text ? { updated: Date.now() } : {}),
    },
  }));

  return streamAssistantMessage(llmId, history, 0, 'off', updateMessage, chainAbortController.signal)
    .then((status) => {
      // re-throw errors, as streamAssistantMessage catches internally
      if (status.outcome === 'aborted')
        throw new Error('Stopped.');
      if (status.outcome === 'errored')
        throw new Error(`Model execution error: ${status.errorMessage || 'Unknown error'}`);
    });
}


export async function executeUserInputChecklistInstruction(
  instruction: UserInputChecklistInstruction,
  { chainAbortController }: StateImmutable,
): Promise<void> {
  const signal = chainAbortController.signal;


  return new Promise((resolve, reject) => {
    console.log('Waiting for user input for:', instruction.label);

    const abortHandler = () => {
      console.log('Operation aborted during user input for:', instruction.label);
      reject(new Error('Operation aborted.'));
    };

    signal.addEventListener('abort', abortHandler);

    setTimeout(() => {
      // Early return if aborted, the reject is already called by abortHandler
      if (signal.aborted)
        return;

      console.log('User input received for:', instruction.label);
      signal.removeEventListener('abort', abortHandler); // Clean up listener
      resolve();
    }, 5000); // Simulate a wait for user input
  });
}


interface StateImmutable {
  readonly llmId: DLLMId;
  readonly chatMessages: DMessage[];
  readonly rayMessages: DMessage[];
  readonly chainAbortController: AbortController;
  readonly onUpdate: (update: FusionUpdateOrFn) => void;
}

interface StateMutable {
  // instructionIndex: number;
  // instructionLabel: string;
}


export function executeFusionInstructions(
  initialFusion: Readonly<BFusion>,
  llmId: DLLMId,
  chatMessages: DMessage[],
  rayMessages: DMessage[],
  onUpdate: (update: FusionUpdateOrFn) => void,
) {


  // Constant state
  const stateImmutable: StateImmutable = {
    llmId: llmId,
    chatMessages: chatMessages,
    rayMessages: rayMessages,
    chainAbortController: new AbortController(),
    onUpdate: onUpdate,
  };

  // Mutable state
  let stateMutable: StateMutable = {
    // instructionIndex: 0,
    // instructionLabel: instructions[0].label,
  };

  const { fusionId, instructions } = initialFusion;

  onUpdate({
    status: 'fusing',
    fusionIssue: undefined,
    outputMessage: createDMessage('assistant', GATHER_PLACEHOLDER),
    abortController: stateImmutable.chainAbortController,
  });

  // Start executing the instructions
  let promiseChain = Promise.resolve();
  console.log('executing instructions', instructions);

  for (const instruction of instructions) {
    promiseChain = promiseChain.then(() => {
      switch (instruction.type) {
        case 'chat-generate':
          return executeChatGenerateInstruction(instruction, stateImmutable);
        case 'user-input-checklist':
          return executeUserInputChecklistInstruction(instruction, stateImmutable);
        default:
          return Promise.reject(new Error('Unsupported Merge instruction'));
      }
    });
  }

  promiseChain
    .then(() => {
      console.log('All instructions executed for fusion:', fusionId);
      onUpdate({
        status: 'success',
        fusionIssue: undefined,
      });
    })
    .catch((error) => {
      // User abort: no need to show an error
      if (stateImmutable.chainAbortController.signal.aborted) {
        console.log('Fusion aborted:', fusionId);
        onUpdate({
          status: 'stopped',
          fusionIssue: 'Stopped.',
        });
        return;
      }

      // Error handling
      console.error('Error executing instructions:', error, fusionId);
      onUpdate({
        status: 'error',
        fusionIssue: 'Issue: ' + (error?.message || error?.toString() || 'Unknown error'),
      });
    })
    .finally(() => {
      onUpdate({
        abortController: undefined,
      });
    });
}


export function fusionGatherStop(fusion: BFusion): BFusion {
  fusion.abortController?.abort();
  return {
    ...fusion,
    ...(fusion.status === 'fusing' ? { status: 'stopped' } : {}),
    abortController: undefined,
  };
}