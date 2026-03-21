import type { Request, Response, NextFunction } from 'express'
import * as CampaignService from './campaign.service'
import { CreateCampaignDto, UpdateCampaignStatusDto } from './campaign.dto'

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateCampaignDto.parse(req.body)
    const campaign = await CampaignService.createCampaign(req.user!.userId, input)
    res.status(201).json(campaign)
  } catch (err) { next(err) }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateCampaignDto.parse(req.body)
    const campaign = await CampaignService.updateCampaign(req.params.id, input, req.user!.userId)
    res.json(campaign)
  } catch (err) { next(err) }
}

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const campaigns = await CampaignService.getCampaigns(req.user!.userId)
    res.json(campaigns)
  } catch (err) { next(err) }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const campaign = await CampaignService.getCampaignById(req.params.id)
    res.json(campaign)
  } catch (err) { next(err) }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const input = UpdateCampaignStatusDto.parse(req.body)
    const campaign = await CampaignService.updateCampaignStatus(req.params.id, input, req.user!.userId)
    res.json(campaign)
  } catch (err) { next(err) }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await CampaignService.deleteCampaign(req.params.id)
    res.json({ ok: true })
  } catch (err) { next(err) }
}

export async function assignRecruiter(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await CampaignService.assignRecruiter(req.params.id, req.body.recruiterUserId)
    res.json(result)
  } catch (err) { next(err) }
}
