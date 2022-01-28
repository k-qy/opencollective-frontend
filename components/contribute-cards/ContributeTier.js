import React from 'react';
import PropTypes from 'prop-types';
import { truncate } from 'lodash';
import { defineMessages, FormattedMessage, injectIntl } from 'react-intl';

import { ContributionTypes } from '../../lib/constants/contribution-types';
import INTERVALS from '../../lib/constants/intervals';
import { TierTypes } from '../../lib/constants/tiers-types';
import { formatCurrency, getPrecisionFromAmount } from '../../lib/currency-utils';
import { isPastEvent } from '../../lib/events';
import { isTierExpired } from '../../lib/tier-utils';
import { getCollectivePageRoute } from '../../lib/url-helpers';
import { capitalize } from '../../lib/utils';

import CollapsableText from '../CollapsableText';
import FormattedMoneyAmount from '../FormattedMoneyAmount';
import { Box, Flex } from '../Grid';
import Link from '../Link';
import StyledLink from '../StyledLink';
import StyledProgressBar from '../StyledProgressBar';
import StyledTooltip from '../StyledTooltip';
import { P, Span } from '../Text';

import Contribute from './Contribute';

const messages = defineMessages({
  fallbackDescription: {
    id: 'TierCard.DefaultDescription',
    defaultMessage:
      '{tierName, select, backer {Become a backer} sponsor {Become a sponsor} other {Join us}}{minAmount, select, 0 {} other { for {minAmountWithCurrency} {interval, select, month {per month} year {per year} other {}}}} and support us',
  },
});

const getContributionTypeFromTier = (tier, isPassed) => {
  if (isPassed) {
    return ContributionTypes.TIER_PASSED;
  } else if (tier.goal) {
    return ContributionTypes.FINANCIAL_GOAL;
  } else if (tier.type === TierTypes.PRODUCT) {
    return ContributionTypes.PRODUCT;
  } else if (tier.type === TierTypes.TICKET) {
    return ContributionTypes.TICKET;
  } else if (tier.type === TierTypes.MEMBERSHIP) {
    return ContributionTypes.MEMBERSHIP;
  } else if (tier.interval) {
    if (tier.interval === INTERVALS.flexible) {
      return ContributionTypes.FINANCIAL_CUSTOM;
    } else {
      return ContributionTypes.FINANCIAL_RECURRING;
    }
  } else {
    return ContributionTypes.FINANCIAL_ONE_TIME;
  }
};

const TierTitle = ({ collective, tier }) => {
  const name = capitalize(tier.name);
  if (!tier.useStandalonePage) {
    return name;
  } else {
    return (
      <StyledTooltip
        content={() => <FormattedMessage id="ContributeTier.GoToPage" defaultMessage="Go to full details page" />}
      >
        <StyledLink
          as={Link}
          href={`${getCollectivePageRoute(collective)}/contribute/${tier.slug}-${tier.id}`}
          color="black.900"
          hoverColor="black.900"
          underlineOnHover
        >
          {name}
        </StyledLink>
      </StyledTooltip>
    );
  }
};

TierTitle.propTypes = {
  collective: PropTypes.shape({
    slug: PropTypes.string,
  }),
  tier: PropTypes.shape({
    id: PropTypes.number,
    slug: PropTypes.string,
    name: PropTypes.string,
    useStandalonePage: PropTypes.bool,
  }),
};

const ContributeTier = ({ intl, collective, tier, ...props }) => {
  const { stats } = tier;
  const currency = tier.currency || collective.currency;
  const isFlexibleAmount = tier.amountType === 'FLEXIBLE';
  const isFlexibleInterval = tier.interval === INTERVALS.flexible;
  const minAmount = isFlexibleAmount ? tier.minimumAmount : tier.amount;
  const amountRaised = stats?.[tier.interval && !isFlexibleInterval ? 'totalRecurringDonations' : 'totalDonated'] || 0;
  const tierIsExpired = isTierExpired(tier);
  const tierType = getContributionTypeFromTier(tier, tierIsExpired);
  const hasNoneLeft = stats?.availableQuantity === 0;
  const canContributeToCollective = collective.isActive && !isPastEvent(collective);
  const isDisabled = !canContributeToCollective || tierIsExpired || hasNoneLeft;

  let description = tier.description;
  if (!tier.description) {
    description = intl.formatMessage(messages.fallbackDescription, {
      minAmount: minAmount || 0,
      tierName: tier.name,
      minAmountWithCurrency: minAmount && formatCurrency(minAmount, currency, { locale: intl.locale }),
      interval: tier.interval ?? '',
    });
  }

  let route;
  if (tierType === ContributionTypes.TICKET) {
    route = `${getCollectivePageRoute(collective)}/order/${tier.id}`;
  } else {
    route = `${getCollectivePageRoute(collective)}/contribute/${tier.slug}-${tier.id}/checkout`;
  }

  return (
    <Contribute
      route={route}
      title={<TierTitle collective={collective} tier={tier} />}
      type={tierType}
      buttonText={tier.button}
      contributors={tier.contributors}
      stats={stats?.contributors}
      data-cy="contribute-card-tier"
      disableCTA={isDisabled}
      {...props}
    >
      <Flex flexDirection="column" justifyContent="space-between" height="100%">
        <Box>
          {tier.maxQuantity > 0 && (
            <P fontSize="1.1rem" color="#e69900" textTransform="uppercase" fontWeight="500" letterSpacing="1px" mb={2}>
              <FormattedMessage
                id="tier.limited"
                values={{
                  maxQuantity: tier.maxQuantity,
                  availableQuantity: stats?.availableQuantity,
                }}
                defaultMessage="LIMITED: {availableQuantity} LEFT OUT OF {maxQuantity}"
              />
            </P>
          )}
          <P mb={2} lineHeight="22px">
            {tier.useStandalonePage ? (
              <React.Fragment>
                {truncate(description, { length: 150 })}{' '}
                <StyledLink
                  as={Link}
                  whiteSpace="nowrap"
                  href={`${getCollectivePageRoute(collective)}/contribute/${tier.slug}-${tier.id}`}
                >
                  <FormattedMessage id="ContributeCard.ReadMore" defaultMessage="Read more" />
                </StyledLink>
              </React.Fragment>
            ) : (
              <CollapsableText text={description} maxLength={150} />
            )}
          </P>
          {tier.goal && (
            <Box mb={1} mt={3}>
              <P fontSize="12px" color="black.600" fontWeight="400">
                <FormattedMessage
                  id="Tier.AmountRaised"
                  defaultMessage="{amount} of {goalWithInterval} raised"
                  values={{
                    amount: (
                      <FormattedMoneyAmount
                        amountStyles={{ fontWeight: '700', color: 'black.700' }}
                        amount={amountRaised}
                        currency={currency}
                        precision={getPrecisionFromAmount(amountRaised)}
                      />
                    ),
                    goalWithInterval: (
                      <FormattedMoneyAmount
                        amountStyles={{ fontWeight: '700', color: 'black.700' }}
                        amount={tier.goal}
                        currency={currency}
                        interval={tier.interval !== INTERVALS.flexible ? tier.interval : null}
                        precision={getPrecisionFromAmount(tier.goal)}
                      />
                    ),
                  }}
                />
                {tier.goal && ` (${Math.round((amountRaised / tier.goal) * 100)}%)`}
              </P>
              <Box mt={1}>
                <StyledProgressBar percentage={amountRaised / tier.goal} />
              </Box>
            </Box>
          )}
        </Box>
        {!isDisabled && minAmount > 0 && (
          <P mt={3} color="black.700">
            {isFlexibleAmount && (
              <Span display="block" fontSize="10px" textTransform="uppercase">
                <FormattedMessage id="ContributeTier.StartsAt" defaultMessage="Starts at" />
              </Span>
            )}
            <Span display="block" data-cy="amount">
              <FormattedMoneyAmount
                amount={minAmount}
                interval={tier.interval && tier.interval !== INTERVALS.flexible ? tier.interval : null}
                currency={currency}
                amountStyles={{ fontSize: '24px', lineHeight: '32px', fontWeight: 'bold', color: 'black.900' }}
                precision={getPrecisionFromAmount(minAmount)}
              />
            </Span>
          </P>
        )}
      </Flex>
    </Contribute>
  );
};

ContributeTier.propTypes = {
  collective: PropTypes.shape({
    slug: PropTypes.string.isRequired,
    currency: PropTypes.string.isRequired,
    isActive: PropTypes.bool,
    parentCollective: PropTypes.shape({
      slug: PropTypes.string.isRequired,
    }),
  }),
  tier: PropTypes.shape({
    id: PropTypes.number.isRequired,
    slug: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    currency: PropTypes.string,
    useStandalonePage: PropTypes.bool,
    interval: PropTypes.string,
    amountType: PropTypes.string,
    endsAt: PropTypes.string,
    button: PropTypes.string,
    goal: PropTypes.number,
    minimumAmount: PropTypes.number,
    amount: PropTypes.number,
    maxQuantity: PropTypes.number,
    stats: PropTypes.shape({
      totalRecurringDonations: PropTypes.number,
      totalDonated: PropTypes.number,
      contributors: PropTypes.object,
      availableQuantity: PropTypes.number,
    }),
    contributors: PropTypes.arrayOf(PropTypes.object),
  }),
  /** @ignore */
  intl: PropTypes.object.isRequired,
};

export default injectIntl(ContributeTier);
