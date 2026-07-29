/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 知识库工作台弹层 — 在列表页之上打开，不抢占整页路由。
 */

import React from 'react';
import { WorkspaceOverlay } from '../common/WorkspaceOverlay';
import { KnowledgeBaseWorkspace, type KnowledgeBaseWorkspaceProps } from './KnowledgeBaseWorkspace';

export interface KnowledgeBaseWorkspaceModalProps extends KnowledgeBaseWorkspaceProps {
  open: boolean;
}

export const KnowledgeBaseWorkspaceModal: React.FC<KnowledgeBaseWorkspaceModalProps> = ({
  open,
  kb,
  onBack,
  ...rest
}) => (
  <WorkspaceOverlay open={open} onClose={onBack} ariaLabel={`知识库：${kb.name}`}>
    <KnowledgeBaseWorkspace kb={kb} onBack={onBack} variant="modal" {...rest} />
  </WorkspaceOverlay>
);
